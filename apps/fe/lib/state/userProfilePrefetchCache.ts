/**
 * userProfilePrefetchCache.ts
 *
 * 목적:
 *  - 피드(PostCard) 등에서 이미 가지고 있는 작성자(author) 최소 정보(닉네임/프로필이미지/팀 요약)를
 *    프로필 모달 이동 전에 "선 캐시"하여 실제 프로필 모달 진입 시 초기 로딩 체감 시간을 줄인다.
 *  - 아바타 클릭 직후 네비게이션과 동시에 Apollo Client를 이용해 상세 프로필 / 최근 게시물 데이터를
 *    비동기 선요청(prefetch)하고, 모달 컴포넌트(UserProfileModal)가 마운트되면 즉시 캐시된 데이터를
 *    사용한 skeleton-less(혹은 skeleton 단축) 렌더를 지원한다.
 *
 * 설계 원칙:
 *  1) 최소 침투: 전역 상태 관리 라이브러리 없이 메모리 싱글톤 모듈 패턴.
 *  2) 다단계 캐시 레벨:
 *     - basic: 피드에서 얻은 author 최소 데이터 (id, nickname, profileImageUrl, optional teams snippet)
 *     - full: GET_USER_PROFILE 결과 (상세 필드)
 *     - posts: GET_USER_POSTS 결과 (사용자 게시물 목록)
 *  3) TTL 기반 갱신:
 *     - BASIC_TTL_MS: 기본 정보는 상대적으로 적게 변하므로 길게
 *     - FULL_TTL_MS / POSTS_TTL_MS: 더 짧게 관리 가능 (필요 시 조정)
 *  4) ApolloClient 주입 방식:
 *     - 본 모듈은 Apollo에 직접 의존하지 않도록 generic fetcher 함수를 옵션으로 받는다.
 *     - 이미 프로젝트에 정의된 GET_USER_PROFILE, GET_USER_POSTS 쿼리를 사용하는 래퍼 함수는
 *       실제 사용 시 앱 측에서 구현하여 넘긴다.
 *
 * 사용 예 (PostCard 아바타 onPress 직전):
 * -----------------------------------------------------------------
 * userProfilePrefetchCache.primeBasicFromAuthor({
 *   id: post.author.id,
 *   nickname: post.author.nickname,
 *   profileImageUrl: post.author.profileImageUrl,
 *   teams: (post.author.myTeams || []).slice(0,3).map(t => ({
 *     teamId: t.team.id,
 *     teamName: t.team.name,
 *     logoUrl: t.team.logoUrl,
 *   }))
 * });
 *
 * // (선택) ApolloClient 기반 미리 가져오기
 * userProfilePrefetchCache.prefetchFullAndPosts(userId, {
 *   fetchFullProfile: () => apolloClient.query({...}),
 *   fetchPosts: () => apolloClient.query({...})
 * });
 *
 * // UserProfileModal 컴포넌트 마운트 시:
 * const cached = userProfilePrefetchCache.get(userId);
 * if (cached?.basic) 즉시 기본 정보 표시 -> full/posts 도착하면 구독 콜백 통해 갱신
 * -----------------------------------------------------------------
 *
 * 구독(옵션):
 *  - 특정 userId 데이터 변경 시 즉시 알림받아 리렌더 최적화
 */

//////////////////// 타입 정의 ////////////////////

export interface BasicAuthorInfo {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  teams?: Array<{
    teamId: string;
    teamName: string;
    logoUrl?: string;
    icon?: string;
  }>;
}

export interface FullUserProfile {
  id: string;
  nickname: string;
  email?: string;
  profileImageUrl?: string;
  bio?: string;
  comment?: string;
  age?: number;
  role?: string;
  isFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  myTeams?: Array<{
    id: string;
    teamId: string;
    priority: number;
    favoriteDate?: string;
    favoritePlayerName?: string;
    favoritePlayerNumber?: number;
    team: {
      id: string;
      name: string;
      logoUrl?: string;
      icon?: string;
    };
  }>;
  // 기타 확장 필드는 백엔드 스키마 변화에 따라 유연하게 확장
  [key: string]: any;
}

export interface UserPostSummary {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  teamId: string;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  media?: Array<{
    id: string;
    url: string;
    type: string;
  }>;
  [key: string]: any;
}

interface CachedUserProfile {
  userId: string;
  basic?: BasicAuthorInfo;
  full?: FullUserProfile;
  posts?: UserPostSummary[];

  lastBasicAt?: number;
  lastFullAt?: number;
  lastPostsAt?: number;

  fullLoading?: boolean;
  postsLoading?: boolean;
  errorFull?: Error;
  errorPosts?: Error;
}

//////////////////// 설정 (TTL) ////////////////////

export const BASIC_TTL_MS = 5 * 60 * 1000;  // 5분
export const FULL_TTL_MS = 60 * 1000;       // 1분
export const POSTS_TTL_MS = 60 * 1000;      // 1분

//////////////////// 내부 상태 ////////////////////

const store: Map<string, CachedUserProfile> = new Map();

type Listener = (snapshot: CachedUserProfile) => void;
const listeners: Map<string, Set<Listener>> = new Map();

//////////////////// 내부 유틸 ////////////////////

const now = () => Date.now();

const ensureEntry = (userId: string): CachedUserProfile => {
  let entry = store.get(userId);
  if (!entry) {
    entry = { userId };
    store.set(userId, entry);
  }
  return entry;
};

const emit = (userId: string) => {
  const entry = store.get(userId);
  if (!entry) return;
  const subs = listeners.get(userId);
  if (!subs) return;
  subs.forEach((cb) => {
    try {
      cb(entry);
    } catch (e) {
      // swallow
      // eslint-disable-next-line no-console
      console.warn("[userProfilePrefetchCache] listener error:", e);
    }
  });
};

const isExpired = (last?: number, ttl?: number) =>
  !last || !ttl || now() - last >= ttl;

//////////////////// 공개 API ////////////////////

export const userProfilePrefetchCache = {
  /**
   * 기본(basic) 정보 선 캐시.
   * - 피드에서 이미 확보한 최소 author 정보로 prime
   * - 기존 basic이 있더라도 더 최신(또는 추가 teams 정보가 더 풍부)하면 merge
   */
  primeBasicFromAuthor(author: BasicAuthorInfo): void {
    if (!author?.id) return;
    const entry = ensureEntry(author.id);

    // teams 정보를 더 풍부하게 업데이트할 수 있으면 merge
    const mergedTeams =
      author.teams && author.teams.length
        ? author.teams
        : entry.basic?.teams || undefined;

    entry.basic = {
      id: author.id,
      nickname: author.nickname ?? entry.basic?.nickname ?? "사용자",
      profileImageUrl:
        author.profileImageUrl ?? entry.basic?.profileImageUrl ?? undefined,
      teams: mergedTeams,
    };
    entry.lastBasicAt = now();
    emit(author.id);
  },

  /**
   * 상세(full) 프로필 직접 주입 (외부에서 미리 받아온 경우)
   */
  setFullProfile(userId: string, full: FullUserProfile): void {
    const entry = ensureEntry(userId);
    entry.full = full;
    entry.lastFullAt = now();
    entry.fullLoading = false;
    entry.errorFull = undefined;
    // full에 포함된 일부 필드로 basic 보강
    if (!entry.basic) {
      entry.basic = {
        id: full.id,
        nickname: full.nickname,
        profileImageUrl: full.profileImageUrl,
      };
      entry.lastBasicAt = entry.lastFullAt;
    }
    emit(userId);
  },

  /**
   * 사용자 게시물(posts) 직접 주입
   */
  setPosts(userId: string, posts: UserPostSummary[]): void {
    const entry = ensureEntry(userId);
    entry.posts = posts;
    entry.lastPostsAt = now();
    entry.postsLoading = false;
    entry.errorPosts = undefined;
    emit(userId);
  },

  /**
   * 캐시 조회
   */
  get(userId: string): CachedUserProfile | undefined {
    return store.get(userId);
  },

  /**
   * 기본 정보가 stale 인지 여부
   */
  needsBasic(userId: string, ttl = BASIC_TTL_MS): boolean {
    const entry = store.get(userId);
    if (!entry?.basic) return true;
    return isExpired(entry.lastBasicAt, ttl);
  },

  /**
   * full(상세 프로필) 갱신 필요 여부
   */
  needsFull(userId: string, ttl = FULL_TTL_MS): boolean {
    const entry = store.get(userId);
    if (!entry?.full) return true;
    return isExpired(entry.lastFullAt, ttl);
  },

  /**
   * posts(게시물) 갱신 필요 여부
   */
  needsPosts(userId: string, ttl = POSTS_TTL_MS): boolean {
    const entry = store.get(userId);
    if (!entry?.posts) return true;
    return isExpired(entry.lastPostsAt, ttl);
  },

  /**
   * 특정 사용자 캐시 제거
   */
  invalidate(userId: string): void {
    store.delete(userId);
    emit(userId);
  },

  /**
   * 전체 캐시 초기화
   */
  clearAll(): void {
    store.clear();
    listeners.clear();
  },

  /**
   * 구독: userId 캐시 변경 시 콜백
   */
  subscribe(userId: string, listener: Listener): () => void {
    if (!listeners.has(userId)) listeners.set(userId, new Set());
    const set = listeners.get(userId)!;
    set.add(listener);
    // 즉시 1회 현재 스냅샷 호출
    const current = store.get(userId);
    if (current) {
      try {
        listener(current);
      } catch (e) {
        // ignore
      }
    }
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(userId);
    };
  },

  /**
   * ApolloClient 등 외부 fetcher를 넘겨 받아 full + posts 선요청
   * - 필요 조건을 검사해 네트워크 최소화
   * - fetcher는 Promise 기반 반환 (결과 data 객체 구조는 호출부에서 변환)
   *
   * options:
   *   fetchFullProfile: () => Promise<FullUserProfile>
   *   fetchPosts: () => Promise<UserPostSummary[]>
   *   force?: boolean (true 시 TTL 무시하고 재요청)
   */
  async prefetchFullAndPosts(
    userId: string,
    options: {
      fetchFullProfile?: () => Promise<FullUserProfile>;
      fetchPosts?: () => Promise<UserPostSummary[]>;
      force?: boolean;
    },
  ): Promise<void> {
    if (!userId) return;
    const entry = ensureEntry(userId);
    const { fetchFullProfile, fetchPosts, force } = options;

    // Full Profile
    const needFull = force || this.needsFull(userId);
    if (needFull && fetchFullProfile && !entry.fullLoading) {
      entry.fullLoading = true;
      emit(userId);
      try {
        const full = await fetchFullProfile();
        this.setFullProfile(userId, full);
      } catch (e: any) {
        entry.fullLoading = false;
        entry.errorFull = e;
        emit(userId);
      }
    }

    // Posts
    const needPosts = force || this.needsPosts(userId);
    if (needPosts && fetchPosts && !entry.postsLoading) {
      entry.postsLoading = true;
      emit(userId);
      try {
        const posts = await fetchPosts();
        this.setPosts(userId, posts);
      } catch (e: any) {
        entry.postsLoading = false;
        entry.errorPosts = e;
        emit(userId);
      }
    }
  },

  /**
   * 디버그 스냅샷
   */
  debugSnapshot() {
    return Array.from(store.values()).map((e) => ({
      userId: e.userId,
      hasBasic: !!e.basic,
      hasFull: !!e.full,
      postCount: e.posts?.length || 0,
      ageBasicMs: e.lastBasicAt ? now() - e.lastBasicAt : null,
      ageFullMs: e.lastFullAt ? now() - e.lastFullAt : null,
      agePostsMs: e.lastPostsAt ? now() - e.lastPostsAt : null,
      fullLoading: e.fullLoading,
      postsLoading: e.postsLoading,
      errorFull: e.errorFull?.message,
      errorPosts: e.errorPosts?.message,
    }));
  },
};

//////////////////// 사용 가이드 (주석) ////////////////////
/**
 * 예시: PostCard 아바타 터치 시
 * -----------------------------------------
 * userProfilePrefetchCache.primeBasicFromAuthor({
 *   id: post.author.id,
 *   nickname: post.author.nickname,
 *   profileImageUrl: post.author.profileImageUrl,
 *   teams: extractTeams(post.author, 3).map(t => ({
 *     teamId: t.id,
 *     teamName: t.name,
 *     logoUrl: t.logoUrl
 *   }))
 * });
 *
 * userProfilePrefetchCache.prefetchFullAndPosts(post.author.id, {
 *   fetchFullProfile: async () => {
 *     const { data } = await apolloClient.query({
 *       query: GET_USER_PROFILE,
 *       variables: { userId: post.author.id },
 *       fetchPolicy: "network-only"
 *     });
 *     return data.getUserById;
 *   },
 *   fetchPosts: async () => {
 *     const { data } = await apolloClient.query({
 *       query: GET_USER_POSTS,
 *       variables: { input: { authorId: post.author.id } },
 *       fetchPolicy: "network-only"
 *     });
 *     return data.posts.posts;
 *   }
 * });
 *
 * UserProfileModal 초기 진입:
 * const cached = userProfilePrefetchCache.get(userId);
 * if (cached?.basic) → 즉시 기본 UI 구성
 * 구독:
 * const unsub = userProfilePrefetchCache.subscribe(userId, snap => setState(...))
 */

//
// commit: feat(cache): add userProfilePrefetchCache for author basic/full profile and posts prefetch
