/**
 * 공지 API 유틸
 * - DB에서 "최신 활성 배너 공지"를 조회하는 함수 제공
 * - DB에서만 조회(목업 fallback 제거)
 *
 * 주의사항:
 * - 현재 Supabase `Database` 타입에 notices 테이블 정의가 없으므로 런타임 쿼리에 any 캐스팅을 사용합니다.
 * - 실제 컬럼 스키마(카멜/스네이크)에 맞춰 `mapDbRowToNotice` 매핑 로직을 유지합니다.
 * - 조회 쿼리는 camelCase → snake_case 순으로 자동 재시도하여 컬럼 네이밍 차이를 흡수합니다.
 */

import supabase from "@/lib/supabase/client";
import {
  Notice,
  NoticeCategory,
  NoticeImportance,
  isActive,
} from "@/lib/notice/types";

export const DEFAULT_NOTICE_TABLE = "notices";

/**
 * DB Row → 앱 Notice 타입으로 변환
 * - DB 컬럼 케이스(카멜/스네이크) 혼재 가능성을 고려한 안전 매핑
 * - 실제 스키마에 맞춰 필요 시 수정
 */
function mapDbRowToNotice(row: Record<string, any>): Notice {
  // 카멜/스네이크 케이스 동시 지원
  const pick = (camel: string, snake: string) =>
    row?.[camel] ?? row?.[snake] ?? null;

  const id = String(pick("id", "id") ?? "");
  const title = String(pick("title", "title") ?? "");
  const content = String(pick("content", "content") ?? "");
  const categoryRaw = String(pick("category", "category") ?? "GENERAL");
  const importanceRaw = String(pick("importance", "importance") ?? "NORMAL");

  const createdAt =
    String(pick("createdAt", "created_at") ?? new Date().toISOString()) || "";
  const updatedAt = String(pick("updatedAt", "updated_at") ?? createdAt) || "";

  const startAt = pick("startAt", "start_at")
    ? String(pick("startAt", "start_at"))
    : undefined;
  const endAt = pick("endAt", "end_at")
    ? String(pick("endAt", "end_at"))
    : undefined;

  const summaryOverride = pick("summaryOverride", "summary_override")
    ? String(pick("summaryOverride", "summary_override"))
    : undefined;

  const tags = pick("tags", "tags")
    ? (pick("tags", "tags") as string[])
    : undefined;

  const pinned = Boolean(pick("pinned", "pinned") ?? false);
  const highlightBanner = Boolean(
    pick("highlightBanner", "highlight_banner") ?? false,
  );
  const draft = Boolean(pick("draft", "draft") ?? false);

  // 안전한 enum 변환 (모르면 기본값)
  const category =
    (NoticeCategory as any)[categoryRaw] ?? NoticeCategory.GENERAL;
  const importance =
    (NoticeImportance as any)[importanceRaw] ?? NoticeImportance.NORMAL;

  return {
    id,
    title,
    content,
    category,
    importance,
    createdAt,
    updatedAt,
    startAt,
    endAt,
    summaryOverride,
    tags,
    pinned,
    highlightBanner,
    draft,
  };
}

/**
 * 배너 공지 쿼리 빌더
 */
function buildBannerQuery(
  client: any,
  tableName: string,
  nowISO: string,
  limit: number,
  style: "camel" | "snake",
) {
  // 컬럼 네이밍(camel/snake) 전환 헬퍼
  const col = (camel: string, snake: string) =>
    style === "camel" ? camel : snake;

  // PostgREST 쿼리 빌더 반환
  return client
    .from(tableName)
    .select("*")
    .eq(col("highlightBanner", "highlight_banner"), true)
    .eq(col("draft", "draft"), false)

    .order(col("createdAt", "created_at"), { ascending: false })
    .limit(limit);
}

/**
 * 최신 공지(가장 최근 createdAt) 쿼리 빌더
 * - 드래프트 제외
 * - 정렬: createdAt DESC
 */
function buildNewestQuery(
  client: any,
  tableName: string,
  limit: number,
  style: "camel" | "snake",
) {
  const col = (camel: string, snake: string) =>
    style === "camel" ? camel : snake;

  return client
    .from(tableName)
    .select("*")
    .eq(col("draft", "draft"), false)
    .order(col("createdAt", "created_at"), { ascending: false })
    .limit(limit);
}
/**
 * DB에서 활성 배너 공지 목록 조회
 * - highlightBanner = true
 * - draft = false
 * - 시간 조건은 클라이언트에서 isActive 로 필터링
 * - createdAt DESC
 *
 * 반환: 변환된 Notice 배열(최대 limit)
 */
export async function fetchActiveBannerNotices(options?: {
  tableName?: string;
  limit?: number;
  now?: Date;
  debug?: boolean;
}): Promise<Notice[]> {
  const {
    tableName = DEFAULT_NOTICE_TABLE,
    limit = 5,
    now = new Date(),
    debug = false,
  } = options ?? {};

  const nowISO = now.toISOString();

  try {
    // Supabase PostgREST 쿼리 구성
    // 주의: .or(...)는 그룹 OR, 체이닝은 AND 로 결합됨
    // Supabase PostgREST 쿼리 구성 (camelCase 우선 → snake_case 재시도)
    const client: any = supabase as any;

    // 1) camelCase 시도
    let rows: Record<string, any>[] = [];
    let firstError: any = null;
    try {
      const { data, error } = await buildBannerQuery(
        client,
        tableName,
        nowISO,
        limit,
        "camel",
      );
      if (error) firstError = error;
      if (Array.isArray(data) && data.length > 0) {
        rows = data;
      }
    } catch (e) {
      firstError = e;
    }

    // 2) 필요 시 snake_case 재시도
    if (rows.length === 0) {
      try {
        const { data, error } = await buildBannerQuery(
          client,
          tableName,
          nowISO,
          limit,
          "snake",
        );
        if (error && debug) {
          // eslint-disable-next-line no-console
          console.warn("[notice/api] snake_case 쿼리 에러:", error);
        }
        if (Array.isArray(data) && data.length > 0) {
          rows = data;
        }
      } catch (e) {
        if (debug) {
          // eslint-disable-next-line no-console
          console.warn("[notice/api] snake_case 쿼리 예외:", e);
        }
      }
    }

    if (rows.length === 0 && firstError && debug) {
      // eslint-disable-next-line no-console
      console.warn("[notice/api] camelCase 쿼리 에러:", firstError);
    }

    // 에러 처리는 camel/snake 재시도 로직에서 처리됨
    const notices = rows.map(mapDbRowToNotice).filter((n) => isActive(n, now));

    if (debug) {
      // eslint-disable-next-line no-console
      console.log(
        `[notice/api] DB 배너 공지 ${notices.length}건 조회 (limit=${limit})`,
      );
    }

    return notices;
  } catch (e: any) {
    if (debug) {
      // eslint-disable-next-line no-console
      console.warn("[notice/api] DB 배너 공지 조회 중 예외:", e);
    }
    return [];
  }
}

/**
 * 가장 최근 공지 1건 조회 (생성일 기준)
 * - draft 제외, 활성(isActive) 여부 검사
 * - createdAt DESC, limit 1
 */
export async function fetchNewestNotice(options?: {
  tableName?: string;
  now?: Date;
  debug?: boolean;
}): Promise<Notice | null> {
  const {
    tableName = DEFAULT_NOTICE_TABLE,
    now = new Date(),
    debug = false,
  } = options ?? {};

  try {
    const client: any = supabase as any;

    // 1) camelCase 시도
    let rows: Record<string, any>[] = [];
    let firstError: any = null;
    try {
      const { data, error } = await buildNewestQuery(
        client,
        tableName,
        1,
        "camel",
      );
      if (error) firstError = error;
      if (Array.isArray(data) && data.length > 0) rows = data;
    } catch (e) {
      firstError = e;
    }

    // 2) 필요 시 snake_case 재시도
    if (rows.length === 0) {
      try {
        const { data, error } = await buildNewestQuery(
          client,
          tableName,
          1,
          "snake",
        );
        if (error && debug) {
          console.warn("[notice/api] buildNewestQuery snake_case 에러:", error);
        }
        if (Array.isArray(data) && data.length > 0) rows = data;
      } catch (e) {
        if (debug) {
          console.warn("[notice/api] buildNewestQuery snake_case 예외:", e);
        }
      }
    }

    if (rows.length === 0) {
      if (firstError && debug) {
        console.warn(
          "[notice/api] buildNewestQuery camelCase 에러:",
          firstError,
        );
      }
      return null;
    }

    // 매핑 + 활성 필터
    const notices = rows.map(mapDbRowToNotice).filter((n) => isActive(n, now));
    if (notices.length === 0) return null;

    // createdAt DESC 보장이나, 방어적 재정렬
    const sorted = [...notices].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return sorted[0] ?? null;
  } catch (e) {
    if (debug) {
      console.warn("[notice/api] fetchNewestNotice 예외:", e);
    }
    return null;
  }
}

/**
 * 최신 공지 여러 건 조회 (최신순)
 * - draft 제외
 * - createdAt DESC
 * - activeOnly=true 시 현재 시각 기준 isActive 필터 적용
 */
export async function fetchLatestNotices(options?: {
  tableName?: string;
  limit?: number; // 기본 5
  activeOnly?: boolean; // 기본 true
  now?: Date;
  debug?: boolean;
}): Promise<Notice[]> {
  const {
    tableName = DEFAULT_NOTICE_TABLE,
    limit = 5,
    activeOnly = true,
    now = new Date(),
    debug = false,
  } = options ?? {};

  try {
    const client: any = supabase as any;

    // 1) camelCase 시도
    let rows: Record<string, any>[] = [];
    let firstError: any = null;
    try {
      const { data, error } = await buildNewestQuery(
        client,
        tableName,
        limit,
        "camel",
      );
      if (error) firstError = error;
      if (Array.isArray(data) && data.length > 0) rows = data;
    } catch (e) {
      firstError = e;
    }

    // 2) 필요 시 snake_case 재시도
    if (rows.length === 0) {
      try {
        const { data, error } = await buildNewestQuery(
          client,
          tableName,
          limit,
          "snake",
        );
        if (error && debug) {
          console.warn(
            "[notice/api] fetchLatestNotices snake_case 에러:",
            error,
          );
        }
        if (Array.isArray(data) && data.length > 0) rows = data;
      } catch (e) {
        if (debug) {
          console.warn("[notice/api] fetchLatestNotices snake_case 예외:", e);
        }
      }
    }

    if (rows.length === 0) {
      if (firstError && debug) {
        console.warn(
          "[notice/api] fetchLatestNotices camelCase 에러:",
          firstError,
        );
      }
      return [];
    }

    // 매핑 및 활성 필터
    let notices = rows.map(mapDbRowToNotice);
    if (activeOnly) {
      notices = notices.filter((n) => isActive(n, now));
    }

    // 최신순 정렬 보강
    notices.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // 방어적 제한
    return notices.slice(0, Math.max(0, limit));
  } catch (e) {
    if (debug) {
      console.warn("[notice/api] fetchLatestNotices 예외:", e);
    }
    return [];
  }
}

/**
 * 최신 활성 배너 공지 1건 조회
 * - DB에서 조회 (목업 fallback 제거)
 *
 * 성능:
 * - limit을 작게 유지(기본 5)하여 시간 필터링 오차 대비
 */
export async function fetchLatestActiveBannerNotice(options?: {
  tableName?: string;
  now?: Date;
  debug?: boolean;
}): Promise<Notice | null> {
  const {
    tableName = DEFAULT_NOTICE_TABLE,
    now = new Date(),
    debug = false,
  } = options ?? {};

  // 1) DB에서 여러 건(최대 5건) 받아서 실제 활성/정합성 필터 후 최상위 1건 선택
  const fromDb = await fetchActiveBannerNotices({
    tableName,
    limit: 5,
    now,
    debug,
  });

  if (fromDb.length > 0) {
    // createdAt 기준 정렬 재확인(방어적)
    const sorted = [...fromDb].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return sorted[0] ?? null;
  }

  return null;
}

/**
 * 예시 사용 방법
 *
 * const banner = await fetchLatestActiveBannerNotice({ debug: __DEV__ });
 * if (banner) {
 *   // 배너 렌더
 * } else {
 *   // 기본 문구/배너 미표시 처리
 * }
 */
