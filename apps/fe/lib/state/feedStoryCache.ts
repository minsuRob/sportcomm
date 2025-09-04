/**
 * feedStoryCache.ts
 *
 * 피드(Post)와 스토리(Story) 데이터를 메모리에 캐싱하고
 * 1분(기본 TTL) 기준으로만 자동 새로고침 여부를 판단하기 위한 중앙 상태 관리 유틸.
 *
 * 목표:
 *  - 화면 전환(프로필, 슬라이더 등) 후 피드/스토리 화면 복귀 시 불필요한 네트워크 재요청 방지
 *  - 앱(또는 탭)이 백그라운드에 갔다가 1분 이상 지난 후 다시 활성화되면 "필요 시" 새로고침 플래그 제공
 *  - 수동 새로고침(Pull-To-Refresh)은 기존 로직 그대로 사용 (이 유틸은 강제하지 않음)
 *
 * 사용 패턴 (예시):
 * ---------------------------------------------------------------------------
 * import { feedStoryCache } from "@/lib/state/feedStoryCache";
 *
 * // 피드 화면 마운트 시:
 * useEffect(() => {
 *   if (feedStoryCache.needsFeedRefresh()) {
 *     await refetchFeed();
 *     feedStoryCache.setFeed(fetchedPosts);
 *   } else {
 *     const cached = feedStoryCache.getFeed();
 *     if (cached) setPosts(cached.posts);
 *   }
 * }, []);
 *
 * // AppState/visibility 기반 자동 stale: feedStoryCache가 내부에서 처리
 * ---------------------------------------------------------------------------
 */

import type { Post } from "@/components/PostCard";
import type { StoryItem } from "@/components/StorySection";

/* ==============================
 * 설정 상수 (TTL)
 * ============================== */
export const FEED_TTL_MS = 60_000;   // 1분
export const STORY_TTL_MS = 60_000;  // 1분

/* ==============================
 * 내부 상태 타입
 * ============================== */
interface CachedFeed {
  posts: Post[];
  lastLoadedAt: number; // epoch ms
}

interface CachedStories {
  stories: StoryItem[];
  lastLoadedAt: number;
}

type FeedListener = (data: CachedFeed | undefined) => void;
type StoryListener = (data: CachedStories | undefined) => void;

/* ==============================
 * 내부 가변 상태
 * ============================== */
let feedCache: CachedFeed | undefined;
let storyCache: CachedStories | undefined;

let feedListeners: Set<FeedListener> = new Set();
let storyListeners: Set<StoryListener> = new Set();

let lastAppForegroundAt: number = Date.now();
let initializedLifecycle = false;

let isFeedStaleFlag = false;
let isStoryStaleFlag = false;

/* ==============================
 * 유틸 함수
 * ============================== */

/**
 * 현재 시간이 lastLoadedAt으로부터 ttl 경과 여부 확인
 */
const isExpired = (lastLoadedAt: number, ttl: number): boolean =>
  Date.now() - lastLoadedAt >= ttl;

/**
 * feedListeners 호출
 */
const emitFeed = () => {
  feedListeners.forEach((cb) => {
    try {
      cb(feedCache);
    } catch (e) {
      console.warn("feed listener error:", e);
    }
  });
};

/**
 * storyListeners 호출
 */
const emitStories = () => {
  storyListeners.forEach((cb) => {
    try {
      cb(storyCache);
    } catch (e) {
      console.warn("story listener error:", e);
    }
  });
};

/**
 * 웹 환경 판별 (간단)
 */
const isWeb = (): boolean => {
  return typeof window !== "undefined" && typeof document !== "undefined";
};

/* ==============================
 * 라이프사이클(AppState / visibility) 초기화
 * - 앱/탭이 foreground로 돌아올 때 경과 시간을 체크하여 stale 플래그 설정
 * ============================== */
const initLifecycle = () => {
  if (initializedLifecycle) return;
  initializedLifecycle = true;

  // React Native AppState (동적 로드)
  let RNAppState: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNAppState = require("react-native").AppState;
  } catch {
    RNAppState = null;
  }

  if (RNAppState?.addEventListener) {
    let lastState = RNAppState.currentState;
    RNAppState.addEventListener("change", (nextState: string) => {
      if (
        (lastState === "background" || lastState === "inactive") &&
        nextState === "active"
      ) {
        handleForeground();
      }
      lastState = nextState;
    });
  }

  // Web: visibilitychange
  if (isWeb()) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleForeground();
      }
    });
  }
};

/**
 * Foreground 복귀 처리
 * - 1분 이상 백그라운드였다면 stale 플래그 true
 */
const handleForeground = () => {
  const now = Date.now();
  const elapsed = now - lastAppForegroundAt;
  lastAppForegroundAt = now;

  if (elapsed >= FEED_TTL_MS) {
    // 새로고침 판단은 컴포넌트가 needsFeedRefresh() 호출 시 true 판단 → 개발자가 refetch 후 setFeed()
    isFeedStaleFlag = true;
  }
  if (elapsed >= STORY_TTL_MS) {
    isStoryStaleFlag = true;
  }
};

/* ==============================
 * Public API
 * ============================== */

/**
 * 피드 캐시 설정
 * @param posts 새로 로드한 게시물 배열
 */
const setFeed = (posts: Post[]): void => {
  feedCache = {
    posts: Array.isArray(posts) ? posts : [],
    lastLoadedAt: Date.now(),
  };
  isFeedStaleFlag = false; // 최신화 되었으니 stale 해제
  emitFeed();
};

/**
 * 현재 피드 캐시 얻기
 * @param allowExpired true면 만료 여부 상관없이 반환 (기본 false: 만료면 undefined)
 */
const getFeed = (allowExpired = true): CachedFeed | undefined => {
  if (!feedCache) return undefined;
  if (!allowExpired && isExpired(feedCache.lastLoadedAt, FEED_TTL_MS)) {
    return undefined;
  }
  return feedCache;
};

/**
 * 피드가 새로고침 필요한지 여부
 * - 캐시가 없거나
 * - TTL 만료되었거나
 * - foreground 복귀로 stale 플래그가 세트된 경우
 */
const needsFeedRefresh = (): boolean => {
  if (!feedCache) return true;
  if (isFeedStaleFlag) return true;
  return isExpired(feedCache.lastLoadedAt, FEED_TTL_MS);
};

/**
 * 피드를 강제로 stale 처리 (다음 진입 시 refetch 유도)
 */
const markFeedStale = (): void => {
  isFeedStaleFlag = true;
};

/**
 * 스토리 캐시 설정
 */
const setStories = (stories: StoryItem[]): void => {
  storyCache = {
    stories: Array.isArray(stories) ? stories : [],
    lastLoadedAt: Date.now(),
  };
  isStoryStaleFlag = false;
  emitStories();
};

/**
 * 스토리 캐시 조회
 * @param allowExpired true면 만료 여부 상관없이 반환
 */
const getStories = (
  allowExpired = true,
): CachedStories | undefined => {
  if (!storyCache) return undefined;
  if (!allowExpired && isExpired(storyCache.lastLoadedAt, STORY_TTL_MS)) {
    return undefined;
  }
  return storyCache;
};

/**
 * 스토리 새로고침 필요 여부
 */
const needsStoryRefresh = (): boolean => {
  if (!storyCache) return true;
  if (isStoryStaleFlag) return true;
  return isExpired(storyCache.lastLoadedAt, STORY_TTL_MS);
};

/**
 * 스토리를 강제로 stale 처리
 */
const markStoriesStale = (): void => {
  isStoryStaleFlag = true;
};

/**
 * 모든 캐시 초기화
 */
const clear = (): void => {
  feedCache = undefined;
  storyCache = undefined;
  isFeedStaleFlag = true;
  isStoryStaleFlag = true;
  emitFeed();
  emitStories();
};

/**
 * 피드 캐시 변경 구독
 * @returns unsubscribe 함수
 */
const subscribeFeed = (listener: FeedListener): (() => void) => {
  feedListeners.add(listener);
  // 즉시 한번 현재 상태 전달 (UX: 빠른 초기 반영)
  try {
    listener(feedCache);
  } catch (e) {
    console.warn(e);
  }
  return () => {
    feedListeners.delete(listener);
  };
};

/**
 * 스토리 캐시 변경 구독
 * @returns unsubscribe 함수
 */
const subscribeStories = (
  listener: StoryListener,
): (() => void) => {
  storyListeners.add(listener);
  try {
    listener(storyCache);
  } catch (e) {
    console.warn(e);
  }
  return () => {
    storyListeners.delete(listener);
  };
};

/**
 * (선택적) 개발/디버그용 상태 스냅샷
 */
const debugSnapshot = () => {
  return {
    feed: feedCache
      ? {
          count: feedCache.posts.length,
          lastLoadedAt: new Date(feedCache.lastLoadedAt).toISOString(),
          ageMs: Date.now() - feedCache.lastLoadedAt,
        }
      : null,
    stories: storyCache
      ? {
          count: storyCache.stories.length,
          lastLoadedAt: new Date(storyCache.lastLoadedAt).toISOString(),
          ageMs: Date.now() - storyCache.lastLoadedAt,
        }
      : null,
    staleFlags: {
      feed: isFeedStaleFlag,
      stories: isStoryStaleFlag,
    },
    lastAppForegroundAt: new Date(lastAppForegroundAt).toISOString(),
  };
};

/* ==============================
 * 초기화 실행
 * ============================== */
initLifecycle();

/* ==============================
 * export 집합
 * ============================== */
export const feedStoryCache = {
  // Feed
  setFeed,
  getFeed,
  needsFeedRefresh,
  markFeedStale,
  // Stories
  setStories,
  getStories,
  needsStoryRefresh,
  markStoriesStale,
  // Common
  clear,
  subscribeFeed,
  subscribeStories,
  FEED_TTL_MS,
  STORY_TTL_MS,
  debugSnapshot,
};

/**
 * 사용 가이드 (간단):
 *
 * const { posts } = useFeedPosts(); 내부 로직 도입 전:
 *   - 마운트 시 feedStoryCache.needsFeedRefresh() 검사
 *   - false면 feedStoryCache.getFeed()로 posts 설정 (네트워크 스킵)
 *   - true면 기존 refetch 후 feedStoryCache.setFeed(newPosts)
 *
 * StorySection 도 동일 패턴.
 *
 * 주의:
 * - 이 캐시는 앱 완전 재시작(메모리 소멸) 시 초기화
 * - 멀티 탭 동기화를 원하면 localStorage 이벤트 브릿지 추가 가능 (현 요구 범위 밖)
 */

// commit: feat(state): add unified feed & story cache with 1min refresh policy
