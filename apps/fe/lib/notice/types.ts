// --------------------------------------------------------------------------------
// NOTICE TYPES & MOCK DATA
// (초기 작성 시 포함되었던 구현 계획 마크다운 제거 - 빌드 방해 요소 삭제)
// --------------------------------------------------------------------------------
//
// 공지(Notice) 도메인 타입 및 목업 데이터/유틸
// - 추후 GraphQL / REST 연동 시 이 파일의 타입을 기준으로 Fragment 또는 DTO 매핑
// - 화면(목록/상세/띠배너 등) 공통 사용 가능하도록 최소/확장 구조 분리
// --------------------------------------------------------------------------------
// - 추후 GraphQL / REST 연동 시 이 파일의 타입을 기준으로 Fragment 또는 DTO 매핑
// - 화면(목록/상세/띠배너 등) 공통 사용 가능하도록 최소/확장 구조 분리
// --------------------------------------------------------------------------------

/**
 * 공지 카테고리
 * - 필요 시 BE와 협의 후 Slug 고정
 */
export enum NoticeCategory {
  GENERAL = "GENERAL", // 일반 안내
  FEATURE = "FEATURE", // 기능 추가/변경
  EVENT = "EVENT", // 이벤트/프로모션
  MAINTENANCE = "MAINTENANCE", // 점검
  POLICY = "POLICY", // 정책/약관/보안
}

/**
 * 공지 중요도
 * - 중요도에 따라 리스트 강조 / 상단 고정 / 색상 차등 표현 가능
 */
export enum NoticeImportance {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * 공지 공개 상태 (파생)
 * - draft: 비공개 (작성중)
 * - scheduled: futureStartAt > now
 * - active: 공개 기간 내
 * - expired: 공개 기간 지난 후
 */
export type NoticeLifecycleStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "expired";

/**
 * 공지 엔티티 기본 타입
 */
export interface Notice {
  id: string;
  title: string;
  content: string; // 마크다운 or 단순 텍스트 (추후 contentType 추가 가능)
  category: NoticeCategory;
  importance: NoticeImportance;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  author?: {
    id: string;
    name: string;
    role?: string;
  };
  /** 노출 시작 (없으면 즉시) */
  startAt?: string;
  /** 노출 종료 (없으면 무기한) */
  endAt?: string;
  /** 목록 요약용 별도 프리뷰(없으면 content 앞부분 사용) */
  summaryOverride?: string;
  /** 태그 (검색/필터) */
  tags?: string[];
  /** 상단 고정 여부 (리스트 정렬 가중치) */
  pinned?: boolean;
  /** 강제 중요 알림 배너(FeedNotice) 우선 노출 후보 */
  highlightBanner?: boolean;
  /** 비공개(Draft) 여부 - true면 노출 제외 */
  draft?: boolean;
}

/**
 * 공지 요약 타입 (목록/작은 카드 등)
 * - content 전체 대신 previewText 로 치환
 */
export interface NoticeSummary {
  id: string;
  title: string;
  previewText: string;
  createdAt: string;
  importance: NoticeImportance;
  category: NoticeCategory;
  pinned: boolean;
  highlightBanner: boolean;
}

/**
 * 페이지네이션 메타 정보
 */
export interface NoticePageInfo {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

/**
 * 목업/실데이터 공통 반환 구조
 */
export interface NoticePage {
  items: NoticeSummary[];
  pageInfo: NoticePageInfo;
}

/**
 * 활성(노출) 상태인지 여부 계산
 */
export function isActive(notice: Notice, now: Date = new Date()): boolean {
  if (notice.draft) return false;
  const start = notice.startAt ? new Date(notice.startAt) : null;
  const end = notice.endAt ? new Date(notice.endAt) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

/**
 * 생명주기 상태 파생
 */
export function getLifecycleStatus(
  notice: Notice,
  now: Date = new Date(),
): NoticeLifecycleStatus {
  if (notice.draft) return "draft";
  const start = notice.startAt ? new Date(notice.startAt) : null;
  const end = notice.endAt ? new Date(notice.endAt) : null;
  if (start && now < start) return "scheduled";
  if (end && now > end) return "expired";
  return "active";
}

/**
 * Preview 텍스트 생성 (summaryOverride > content 앞부분)
 */
export function buildPreviewText(notice: Notice, length: number = 80): string {
  if (notice.summaryOverride) return notice.summaryOverride.trim();
  const raw = notice.content.replace(/\s+/g, " ").trim();
  if (raw.length <= length) return raw;
  return raw.slice(0, length).trim() + "…";
}

/**
 * Notice -> NoticeSummary 변환
 */
export function toSummary(notice: Notice): NoticeSummary {
  return {
    id: notice.id,
    title: notice.title,
    previewText: buildPreviewText(notice),
    createdAt: notice.createdAt,
    importance: notice.importance,
    category: notice.category,
    pinned: !!notice.pinned,
    highlightBanner: !!notice.highlightBanner,
  };
}

/**
 * 목업 데이터
 * - 실제 서비스 전환 시: 이 배열 제거 → 서버 쿼리 (e.g., GraphQL query Notices)
 */
export const NOTICE_MOCKS: Notice[] = [
  {
    id: "n001",
    title: "스포츠 커뮤니티 베타 오픈 안내",
    content:
      "안녕하세요! 스포츠 팬 여러분.\n\n저희 커뮤니티가 베타로 오픈했습니다. 버그 제보와 피드백은 언제나 환영합니다. 빠르게 개선해 나가겠습니다!",
    category: NoticeCategory.GENERAL,
    importance: NoticeImportance.HIGH,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    highlightBanner: true,
    pinned: true,
    tags: ["beta", "open"],
  },
  {
    id: "n002",
    title: "팀 컬러 커스터마이징 기능 추가",
    content:
      "프로필 > 팀 설정에서 '테마 컬러' 를 지정하면 피드 상단 일부 UI 색상에 반영됩니다. 더 많은 개인화 기능이 준비 중입니다.",
    category: NoticeCategory.FEATURE,
    importance: NoticeImportance.NORMAL,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["feature", "customization"],
  },
  {
    id: "n003",
    title: "서버 점검 예정 (이번 토요일 02:00~03:00)",
    content:
      "안정적인 서비스 제공을 위해 정기 점검이 예정되어 있습니다.\n점검 시간 동안 로그인/게시물 작성 기능이 제한될 수 있습니다.",
    category: NoticeCategory.MAINTENANCE,
    importance: NoticeImportance.CRITICAL,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
    startAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    endAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
    tags: ["maintenance"],
  },
  {
    id: "n004",
    title: "이벤트: 주간 활약상 댓글 추첨",
    content:
      "베타 기간 동안 좋아요/댓글 활동이 많은 사용자 중 매주 5명을 추첨하여 소정의 리워드를 드립니다.\n자세한 규칙은 추후 공지 예정!",
    category: NoticeCategory.EVENT,
    importance: NoticeImportance.NORMAL,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    highlightBanner: false,
    tags: ["event", "reward"],
  },
  {
    id: "n005",
    title: "약관 일부 개정 사전 안내",
    content:
      "커뮤니티 건전성 강화를 위해 운영정책(욕설/비방 관련) 조항이 추가될 예정입니다. 세부 조항은 개정 7일 전 다시 안내드립니다.",
    category: NoticeCategory.POLICY,
    importance: NoticeImportance.HIGH,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["policy"],
  },
];

/**
 * 목업 기반 페이지네이션 조회
 * @param page 1-based page index
 * @param pageSize 페이지 크기
 * @param options 필터 옵션 (카테고리 / 활성만 등)
 */
export function fetchMockNotices(
  page: number,
  pageSize: number,
  options?: {
    category?: NoticeCategory;
    activeOnly?: boolean;
    importance?: NoticeImportance;
    order?: "NEWEST" | "PINNED_FIRST";
  },
): NoticePage {
  const now = new Date();
  let filtered = [...NOTICE_MOCKS];

  if (options?.category) {
    filtered = filtered.filter((n) => n.category === options.category);
  }
  if (options?.importance) {
    filtered = filtered.filter((n) => n.importance === options.importance);
  }
  if (options?.activeOnly) {
    filtered = filtered.filter((n) => isActive(n, now));
  }
  // 정렬
  if (options?.order === "PINNED_FIRST") {
    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const slice = filtered.slice(start, end).map(toSummary);

  return {
    items: slice,
    pageInfo: {
      page,
      pageSize,
      total,
      hasNext: end < total,
    },
  };
}

/**
 * 향후 실제 API 연동 시 가이드:
 * 1. GraphQL 예시
 *    query Notices($page:Int!,$size:Int!){ notices(page:$page,size:$size){ ... } }
 *    - 서버에서 pinned + createdAt 복합 정렬
 * 2. 캐싱
 *    - react-query 혹은 Apollo 사용 시 key: ["notices", filters]
 * 3. FeedNotice 와의 연계
 *    - highlightBanner === true && isActive 인 항목 중 최신 1건 선택
 * 4. 상세 진입
 *    - / (details)/notice/[noticeId].tsx 페이지 생성 후 fetch(단건)
 */

// --------------------------------------------------------------------------------
// 유지보수 참고:
// - 필요 시 contentType (MARKDOWN/PLAIN/RICH) 추가
// - 로컬라이징: titleI18nKey / contentI18nKey 설계 가능
// - 태그/카테고리 필터링 고도화 시 별도 인덱싱 유틸 추가
// --------------------------------------------------------------------------------
//
// commit: feat(notice): 공지 도메인 타입 및 목업/유틸 추가
