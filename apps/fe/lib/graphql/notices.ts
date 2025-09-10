/**
 * 공지(Notice) GraphQL Queries & Mutations
 * - 백엔드 신규 Notice 도메인 연동
 * - 기존 FE 목업 NOTICE_MOCKS 대체
 *
 * 사용 예시:
 * const { data, loading } = useQuery(GET_HIGHLIGHT_NOTICE);
 * const { data } = useQuery(GET_NOTICES, { variables: { input: { page: 1, limit: 10, activeOnly: true, pinnedFirst: true } }});
 *
 * 관리자 전용(ADMIN Role):
 * useMutation(CREATE_NOTICE) / UPDATE_NOTICE / DELETE_NOTICE
 */

import { gql } from "@apollo/client";

/* ============================================================================
 * Fragment
 * - 공용 필드 재사용
 * ==========================================================================*/
export const NOTICE_CORE_FIELDS = gql`
  fragment NoticeCoreFields on Notice {
    id
    title
    content
    category
    importance
    pinned
    highlightBanner
    draft
    startAt
    endAt
    createdAt
    updatedAt
    isActive
    lifecycleStatus
  }
`;

/* ============================================================================
 * Queries
 * ==========================================================================*/

/**
 * 강조(배너) 공지 1건 조회 (없으면 null)
 */
export const GET_HIGHLIGHT_NOTICE = gql`
  query HighlightNotice {
    highlightNotice {
      ...NoticeCoreFields
    }
  }
  ${NOTICE_CORE_FIELDS}
`;

/**
 * 공지 목록 조회
 * - input.activeOnly: true 시 활성 공지만
 * - input.pinnedFirst: true 시 고정 우선 정렬
 */
export const GET_NOTICES = gql`
  query Notices($input: FindNoticesInput) {
    notices(input: $input) {
      items {
        ...NoticeCoreFields
      }
      total
      page
      limit
      totalPages
      hasNext
      hasPrev
    }
  }
  ${NOTICE_CORE_FIELDS}
`;

/**
 * 공지 단건 조회
 */
export const GET_NOTICE = gql`
  query Notice($id: String!) {
    notice(id: $id) {
      ...NoticeCoreFields
    }
  }
  ${NOTICE_CORE_FIELDS}
`;

/* ============================================================================
 * Mutations (관리자 전용)
 * ==========================================================================*/

/**
 * 공지 생성
 */
export const CREATE_NOTICE = gql`
  mutation CreateNotice($input: CreateNoticeGqlInput!) {
    createNotice(input: $input) {
      ...NoticeCoreFields
    }
  }
  ${NOTICE_CORE_FIELDS}
`;

/**
 * 공지 수정
 */
export const UPDATE_NOTICE = gql`
  mutation UpdateNotice($input: UpdateNoticeGqlInput!) {
    updateNotice(input: $input) {
      ...NoticeCoreFields
    }
  }
  ${NOTICE_CORE_FIELDS}
`;

/**
 * 공지 삭제
 */
export const DELETE_NOTICE = gql`
  mutation DeleteNotice($id: String!) {
    deleteNotice(id: $id)
  }
`;

/* ============================================================================
 * TypeScript 타입 정의 (선택적 사용)
 * - 백엔드 스키마 변경 시 수동 업데이트 필요 (코드젠 도입 전 임시)
 * ==========================================================================*/

export type NoticeCategory =
  | "GENERAL"
  | "FEATURE"
  | "EVENT"
  | "MAINTENANCE"
  | "POLICY";

export type NoticeImportance = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export interface Notice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  importance: NoticeImportance;
  pinned: boolean;
  highlightBanner: boolean;
  draft: boolean;
  startAt?: string | null;
  endAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  lifecycleStatus: "draft" | "scheduled" | "active" | "expired";
  authorId?: string | null;
}

export interface NoticesPage {
  items: Notice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FindNoticesInput {
  page?: number;
  limit?: number;
  category?: NoticeCategory;
  importance?: NoticeImportance;
  activeOnly?: boolean;
  pinnedFirst?: boolean;
}

export interface CreateNoticeInput {
  title: string;
  content: string;
  category: NoticeCategory;
  importance?: NoticeImportance;
  pinned?: boolean;
  highlightBanner?: boolean;
  draft?: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface UpdateNoticeInput extends Partial<CreateNoticeInput> {
  id: string;
}

/* ============================================================================
 * 유틸: GraphQL Variables 헬퍼 (선택적)
 * ==========================================================================*/

/**
 * 목록 조회 변수 헬퍼
 */
export function buildNoticesVariables(input: FindNoticesInput = {}): {
  input: FindNoticesInput;
} {
  return {
    input: {
      page: input.page ?? 1,
      limit: input.limit ?? 10,
      category: input.category,
      importance: input.importance,
      activeOnly: input.activeOnly,
      pinnedFirst: input.pinnedFirst,
    },
  };
}

/**
 * 생성 입력 기본값
 */
export function createNoticeDefaults(): CreateNoticeInput {
  return {
    title: "",
    content: "",
    category: "GENERAL",
    importance: "NORMAL",
    pinned: false,
    highlightBanner: false,
    draft: false,
  };
}

/**
 * 안전한 날짜 포맷(or 빈 문자열)
 */
export function safeDateISO(date?: Date | null): string | undefined {
  return date ? date.toISOString() : undefined;
}

/* ============================================================================
 * NOTE:
 * - 코드젠 도입 시 gql-codegen 으로 자동 타입 생성 권장
 * - 에러/로딩/캐싱 정책은 호출부(Apollo useQuery/useMutation)에서 제어
 * - 관리자 UI 에서 optimistic UI 필요 시 optimisticResponse 사용
 * ==========================================================================*/

/**
 * GraphQL Mutation Variables (프론트 전용 타입)
 * - 코드젠 이전 임시 수동 정의
 */
export interface CreateNoticeMutationVariables {
  input: CreateNoticeInput;
}

export interface UpdateNoticeMutationVariables {
  input: UpdateNoticeInput;
}

export interface DeleteNoticeMutationVariables {
  id: string;
}
