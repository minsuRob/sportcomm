/**
 * feedAdvancedCache.ts
 *
 * 고급 피드 캐시 (팀 필터/차단 사용자/페이지네이션 대응)
 * - 팀 필터 조합(또는 null) 별로 독립된 캐시 버킷을 유지
 * - 각 버킷은 페이지 단위(posts, hasNext, currentPage, total 등) 관리
 * - 차단 사용자 목록 반영 -> 조회 시 필터링
 * - TTL(기본 60초) 내에서는 동일 필터 재진입 시 네트워크 요청 생략
 * - 앱 foreground 복귀 이후 TTL 경과 시 각 버킷 stale 처리
 *
 * 사용 시나리오(요약):
 *  --------------------------------------------------------------------------
 *  const key = buildFeedKey(teamIds); // teamIds: string[] | null
 *  if (feedAdvancedCache.needsRefresh(key)) {
 *     // 네트워크 호출 -> 결과 pages[1] 세팅
 *     feedAdvancedCache.setFirstPage(key, { posts, pageInfo });
 *  } else {
 *     const data = feedAdvancedCache.getMergedPosts(key);
 *  }
 *
 *  // 추가 페이지 로드
 *  feedAdvancedCache.appendPage(key, nextPageNumber, { posts, pageInfo });
 *
 *  // 차단 사용자 목록 갱신
 *  feedAdvancedCache.setBlockedUsers(blockedIds);
 *
 *  // 구독 (UI 자동 반영)
 *  const unsub = feedAdvancedCache.subscribe(key, (state) => { ... });
 *  --------------------------------------------------------------------------
 *
 * 확장 포인트:
 *  - LRU 기반 버킷 수 제한
 *  - Persist(Storage) 연계
 *  - Per-user namespace
 */

import type { Post } from "@/components/PostCard";

/* =========================================
 * 타입 정의
 * =======================================*/

export interface FeedPage {
  page: number;
  posts: Post[];
  hasNext: boolean;
  total?: number;
  totalPages?: number;
  limit?: number;
}

interface FeedBucket {
  key: string;                // 팀 필터 key
  pages: Map<number, FeedPage>;
  merged: Post[];             // 정렬/차단 사용자 필터링 후 최종 posts
  hasNext: boolean;
  lastLoadedAt: number;       // 최근(마지막 페이지 OR 첫 페이지) 로드 시간
  stale: boolean;             // 강제 갱신 요구 플래그
  blockedVersion: number;     // 차단 리스트 버전 동기화용
  meta?: {
    total?: number;
    totalPages?: number;
    limit?: number;
  };
}

export interface FeedBucketSnapshot {
  key: string;
  posts: Post[];
  hasNext: boolean;
  lastLoadedAt: number;
  stale: boolean;
  pageCount: number;
  total?: number;
  totalPages?: number;
  limit?: number;
}

type BucketListener = (snapshot: FeedBucketSnapshot | undefined) => void;

/* =========================================
 * 설정 상수
 * =======================================*/

const FEED_TTL_MS = 60_000;          // 1분
const MAX_BUCKETS = 12;              // LRU 제거 한도
const FOREGROUND_STALE_THRESHOLD = FEED_TTL_MS;
const DEBUG = false;

/* =========================================
 * 내부 상태
 * =======================================*/

let buckets: Map<string, FeedBucket> = new Map();
let listenersMap: Map<string, Set<BucketListener>> = new Map();

let blockedUsers: Set<string> = new Set();
let blockedVersionGlobal = 0;

let lastForegroundAt = Date.now();
let lifecycleInitialized = false;

/* =========================================
 * 유틸
 * =======================================*/

/**
 * 팀 필터 key 생성
 * - null | 빈배열 => "ALL"
 * - 정렬 후 join → 순서 무관
 */
export const buildFeedKey = (teamIds: string[] | null | undefined): string => {
  if (!teamIds || teamIds.length === 0) return "ALL";
  return teamIds.slice().sort().join(",");
};

const now = () => Date.now();

const isExpired = (bucket: FeedBucket): boolean =>
  now() - bucket.lastLoadedAt >= FEED_TTL_MS;

const pruneLRUIfNeeded = () => {
  if (buckets.size <= MAX_BUCKETS) return;

  const arr = Array.from(buckets.values()).sort(
    (a, b) => a.lastLoadedAt - b.lastLoadedAt,
  );
  const removeCount = buckets.size - MAX_BUCKETS;
  for (let i = 0; i < removeCount; i++) {
    const victim = arr[i];
    buckets.delete(victim.key);
    listenersMap.delete(victim.key);
    if (DEBUG) console.log("[feedAdvancedCache] LRU prune:", victim.key);
  }
};

/**
 * 버킷 스냅샷 생성 (listener 전달 전 가공)
 */
const toSnapshot = (bucket: FeedBucket): FeedBucketSnapshot => ({
  key: bucket.key,
  posts: bucket.merged,
  hasNext: bucket.hasNext,
  lastLoadedAt: bucket.lastLoadedAt,
  stale: bucket.stale,
  pageCount: bucket.pages.size,
  total: bucket.meta?.total,
  totalPages: bucket.meta?.totalPages,
  limit: bucket.meta?.limit,
});

/**
 * 차단 사용자 필터 적용
 */
const applyBlockedFilter = (posts: Post[]): Post[] =>
  posts.filter((p) => !blockedUsers.has(p.author.id));

/**
 * 페이지 병합 후 최신 merged 배열 재구성
 * - 페이지 번호 오름차순 → createdAt 내림차순 (백엔드 응답이 이미 정렬되어 있다고 가정하면 단순 concat 가능)
 * - 중복 제거 (Map)
 */
const rebuildMergedPosts = (bucket: FeedBucket): void => {
  const pageNumbers = Array.from(bucket.pages.keys()).sort((a, b) => a - b);
  const map = new Map<string, Post>();
  for (const pn of pageNumbers) {
    const page = bucket.pages.get(pn)!;
    for (const post of page.posts) {
      map.set(post.id, post);
    }
  }
  const merged = Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  bucket.merged = applyBlockedFilter(merged);
};

/**
 * 리스너 호출
 */
const emit = (key: string) => {
  const bucket = buckets.get(key);
  const listeners = listenersMap.get(key);
  if (!listeners || listeners.size === 0) return;
  const snapshot = bucket ? toSnapshot(bucket) : undefined;
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch (e) {
      console.warn("[feedAdvancedCache] listener error:", e);
    }
  });
};

/* =========================================
 * Lifecycle (Foreground 감지)
 * =======================================*/
const initLifecycle = () => {
  if (lifecycleInitialized) return;
  lifecycleInitialized = true;

  let RNAppState: any;
  try {
    RNAppState = require("react-native").AppState;
  } catch {
    RNAppState = null;
  }

  if (RNAppState?.addEventListener) {
    let last = RNAppState.currentState;
    RNAppState.addEventListener("change", (next: string) => {
      if (
        (last === "background" || last === "inactive") &&
        next === "active"
      ) {
        handleForeground();
      }
      last = next;
    });
  }

  if (typeof document !== "undefined" && typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleForeground();
      }
    });
  }
};

const handleForeground = () => {
  const nowTs = now();
  const elapsed = nowTs - lastForegroundAt;
  lastForegroundAt = nowTs;
  if (elapsed >= FOREGROUND_STALE_THRESHOLD) {
    // 모든 버킷 stale 처리 (TTL 만료로 간주)
    buckets.forEach((b) => {
      b.stale = true;
    });
    buckets.forEach((b) => emit(b.key));
  }
};

initLifecycle();

/* =========================================
 * Public API
 * =======================================*/

export const feedAdvancedCache = {
  /**
   * 첫 페이지(또는 새 필터) 설정
   * 기존 데이터 초기화, page=1 기준
   */
  setFirstPage(
    key: string,
    page: Omit<FeedPage, "page"> & { page?: number },
  ): void {
    const bucket: FeedBucket = {
      key,
      pages: new Map(),
      merged: [],
      hasNext: page.hasNext,
      lastLoadedAt: now(),
      stale: false,
      blockedVersion: blockedVersionGlobal,
      meta: {
        total: page.total,
        totalPages: page.totalPages,
        limit: page.limit,
      },
    };
    const pageNumber = page.page ?? 1;
    bucket.pages.set(pageNumber, {
      page: pageNumber,
      posts: page.posts,
      hasNext: page.hasNext,
      total: page.total,
      totalPages: page.totalPages,
      limit: page.limit,
    });
    rebuildMergedPosts(bucket);
    buckets.set(key, bucket);
    pruneLRUIfNeeded();
    emit(key);
  },

  /**
   * 추가 페이지 append
   * - page 번호가 1보다 크고, 연속이 아닐 경우에도 허용(필요시 검증 추가 가능)
   */
  appendPage(
    key: string,
    pageNumber: number,
    page: Omit<FeedPage, "page">,
  ): void {
    const bucket = buckets.get(key);
    if (!bucket) {
      // 존재하지 않으면 새로 생성 (안전)
      this.setFirstPage(key, { ...page, page: pageNumber });
      return;
    }
    bucket.pages.set(pageNumber, {
      page: pageNumber,
      posts: page.posts,
      hasNext: page.hasNext,
      total: page.total,
      totalPages: page.totalPages,
      limit: page.limit,
    });
    bucket.hasNext = page.hasNext;
    bucket.meta = {
      total: page.total ?? bucket.meta?.total,
      totalPages: page.totalPages ?? bucket.meta?.totalPages,
      limit: page.limit ?? bucket.meta?.limit,
    };
    bucket.lastLoadedAt = now();
    bucket.stale = false;
    rebuildMergedPosts(bucket);
    emit(key);
  },

  /**
   * 특정 페이지 교체(재로드)
   */
  replacePage(
    key: string,
    pageNumber: number,
    page: Omit<FeedPage, "page">,
  ): void {
    const bucket = buckets.get(key);
    if (!bucket) {
      this.setFirstPage(key, { ...page, page: pageNumber });
      return;
    }
    bucket.pages.set(pageNumber, {
      page: pageNumber,
      posts: page.posts,
      hasNext: page.hasNext,
      total: page.total,
      totalPages: page.totalPages,
      limit: page.limit,
    });
    bucket.hasNext = page.hasNext;
    bucket.lastLoadedAt = now();
    rebuildMergedPosts(bucket);
    emit(key);
  },

  /**
   * 버킷 단위 전체 상태 스냅샷
   */
  getBucketSnapshot(key: string): FeedBucketSnapshot | undefined {
    const bucket = buckets.get(key);
    return bucket ? toSnapshot(bucket) : undefined;
  },

  /**
   * 병합된 포스트 배열 (차단 사용자 필터 포함)
   */
  getMergedPosts(key: string): Post[] {
    const bucket = buckets.get(key);
    return bucket ? bucket.merged : [];
  },

  /**
   * 새로고침 필요 여부
   * - 버킷 없음
   * - stale flag
   * - TTL 만료
   * - 차단 사용자 버전 mismatch(= 차단 목록 변동)
   */
  needsRefresh(key: string): boolean {
    const bucket = buckets.get(key);
    if (!bucket) return true;
    if (bucket.stale) return true;
    if (isExpired(bucket)) return true;
    if (bucket.blockedVersion !== blockedVersionGlobal) return true;
    return false;
  },

  /**
   * 해당 버킷 강제 stale 처리
   */
  markStale(key: string): void {
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.stale = true;
      emit(key);
    }
  },

  /**
   * 전체 버킷을 stale 처리 (로그아웃 / 글로벌 정책 변경)
   */
  markAllStale(): void {
    buckets.forEach((b) => (b.stale = true));
    buckets.forEach((b) => emit(b.key));
  },

  /**
   * 포스트 단건 업데이트 (예: 좋아요/북마크 토글)
   */
  updatePostAcrossBuckets(updated: Post): void {
    buckets.forEach((bucket) => {
      let changed = false;
      // 페이지 단위 탐색
      bucket.pages.forEach((pg) => {
        const idx = pg.posts.findIndex((p) => p.id === updated.id);
        if (idx >= 0) {
          pg.posts[idx] = { ...pg.posts[idx], ...updated };
          changed = true;
        }
      });
      if (changed) {
        rebuildMergedPosts(bucket);
        bucket.lastLoadedAt = now();
        emit(bucket.key);
      }
    });
  },

  /**
   * 포스트 제거 (예: 삭제)
   */
  removePostEverywhere(postId: string): void {
    buckets.forEach((bucket) => {
      let changed = false;
      bucket.pages.forEach((pg) => {
        const before = pg.posts.length;
        pg.posts = pg.posts.filter((p) => p.id !== postId);
        if (pg.posts.length !== before) changed = true;
      });
      if (changed) {
        rebuildMergedPosts(bucket);
        bucket.lastLoadedAt = now();
        emit(bucket.key);
      }
    });
  },

  /**
   * 차단 사용자 목록 설정
   * - 버전 증가 → 버킷 blockedVersion mismatch 발생 → needsRefresh true
   * - 즉시 재필터링 (옵션) 가능하나 여기서는 needsRefresh 로 지연
   */
  setBlockedUsers(userIds: string[]): void {
    blockedUsers = new Set(userIds);
    blockedVersionGlobal++;
    // 이미 캐시된 데이터에서 즉시 필터링을 수행하고 싶다면 아래 로직 활성화:
    buckets.forEach((b) => {
      b.blockedVersion = blockedVersionGlobal;
      rebuildMergedPosts(b);
      emit(b.key);
    });
  },

  /**
   * 캐시 비우기(로그아웃 등)
   */
  clearAll(): void {
    buckets.clear();
    listenersMap.clear();
  },

  /**
   * 버킷 제거 (해당 필터 캐시 무효화)
   */
  removeBucket(key: string): void {
    buckets.delete(key);
    listenersMap.delete(key);
    emit(key); // undefined 전달
  },

  /**
   * 구독 (특정 key)
   */
  subscribe(key: string, listener: BucketListener): () => void {
    if (!listenersMap.has(key)) {
      listenersMap.set(key, new Set());
    }
    const set = listenersMap.get(key)!;
    set.add(listener);
    // 즉시 1회 호출
    try {
      listener(this.getBucketSnapshot(key));
    } catch (e) {
      console.warn(e);
    }
    return () => {
      set.delete(listener);
      if (set.size === 0) listenersMap.delete(key);
    };
  },

  /**
   * Debug Snapshot
   */
  debugSnapshot(): any {
    return {
      bucketCount: buckets.size,
      buckets: Array.from(buckets.values()).map((b) => ({
        key: b.key,
        pages: Array.from(b.pages.keys()),
        mergedLength: b.merged.length,
        hasNext: b.hasNext,
        stale: b.stale,
        ageMs: now() - b.lastLoadedAt,
        lastLoadedAt: new Date(b.lastLoadedAt).toISOString(),
      })),
      blockedUsers: Array.from(blockedUsers),
      blockedVersionGlobal,
      lastForegroundAt: new Date(lastForegroundAt).toISOString(),
    };
  },
};

/* =========================================
 * 예시 사용 가이드 (주석)
 * =======================================*/
/**
 * // 1) Key 생성
 * const key = buildFeedKey(selectedTeamIds); // teamIds: string[] | null
 *
 * // 2) needsRefresh 로 판단
 * if (feedAdvancedCache.needsRefresh(key)) {
 *   const result = await fetchPosts({ page: 1, teamIds: selectedTeamIds });
 *   feedAdvancedCache.setFirstPage(key, {
 *     posts: result.posts,
 *     hasNext: result.hasNext,
 *     total: result.total,
 *     totalPages: result.totalPages,
 *     limit: result.limit,
 *   });
 * } else {
 *   const posts = feedAdvancedCache.getMergedPosts(key);
 * }
 *
 * // 3) 페이지 추가
 * const nextPage = currentPage + 1;
 * const result2 = await fetchPosts({ page: nextPage });
 * feedAdvancedCache.appendPage(key, nextPage, {
 *   posts: result2.posts,
 *   hasNext: result2.hasNext,
 *   total: result2.total,
 *   totalPages: result2.totalPages,
 *   limit: result2.limit,
 * });
 *
 * // 4) 구독
 * useEffect(() => {
 *   const unsub = feedAdvancedCache.subscribe(key, snap => {
 *     if (snap) setPosts(snap.posts);
 *   });
 *   return unsub;
 * }, [key]);
 *
 * // 5) 차단 사용자 갱신
 * feedAdvancedCache.setBlockedUsers(blockedIds);
 *
 * // 6) 포스트 상태 업데이트
 * feedAdvancedCache.updatePostAcrossBuckets(updatedPost);
 *
 * // 7) 로그아웃 / 초기화
 * feedAdvancedCache.clearAll();
 */

/* commit: feat(cache): add advanced feed cache with team filter keys, blocked users, pagination support */
