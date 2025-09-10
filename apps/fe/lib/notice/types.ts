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
