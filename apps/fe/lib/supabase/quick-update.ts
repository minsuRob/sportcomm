import { supabase } from "./client";
import type { User } from "@/lib/auth";
import { getSession, saveSession } from "@/lib/auth";

/**
 * 경량 사용자 속성(나이/성별) 업데이트 유틸
 * - GraphQL 레이어를 거치지 않고 Supabase(PostgREST)로 직접 업데이트
 * - 회원가입 직후 등 빠른 저장이 필요한 경우에 사용
 *
 * 주의:
 * - RLS 정책에 따라 권한이 필요합니다(현재 로그인 사용자 본인만 수정 가능하도록 설계 가정).
 * - 클라이언트 타입 정의가 최신 스키마와 다를 수 있어, 필요한 필드만 부분 업데이트합니다.
 */

/** 허용 가능한 성별 값(정규화 후) */
export type GenderCode = "M" | "F" | "O";

/** 입력에서 다양한 표현을 지원하기 위한 타입 */
export type GenderInput =
  | GenderCode
  | "male"
  | "female"
  | "other"
  | "남"
  | "여"
  | "기타";

/** 공통 옵션 */
export interface QuickUpdateOptions {
  /** 로컬 세션(User)도 즉시 반영할지 여부 (기본값: true) */
  updateLocal?: boolean;
}

/** 업데이트 결과 */
export interface QuickUpdateResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 업데이트 결과 데이터 형태 */
export interface QuickUpdatedUserSlice {
  id: string;
  age?: number | null;
  gender?: GenderCode | null;
}

/**
 * 성별 입력값을 표준 코드로 정규화
 * - "male" | "남" -> "M"
 * - "female" | "여" -> "F"
 * - 그 외 -> "O"
 */
export function normalizeGender(input: GenderInput): GenderCode {
  const v = String(input).trim().toLowerCase();
  if (v === "m" || v === "male" || v === "남" || v === "man" || v === "boy") {
    return "M";
  }
  if (v === "f" || v === "female" || v === "여" || v === "woman" || v === "girl") {
    return "F";
  }
  return "O";
}

/**
 * 나이 입력값을 안전 범위로 클램프(1~120), 숫자 아님 -> null
 */
export function sanitizeAge(age: unknown): number | null {
  const n = Number(age);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.max(1, Math.min(120, Math.trunc(n)));
  return clamped;
}

/**
 * 현재 로그인 사용자의 ID를 가져옵니다.
 */
async function getCurrentUserId(): Promise<QuickUpdateResult<string>> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return { success: false, error: error.message };
    const uid = data?.user?.id;
    if (!uid) return { success: false, error: "로그인 정보가 없습니다." };
    return { success: true, data: uid };
  } catch (e: any) {
    return { success: false, error: e?.message || "사용자 정보 조회 실패" };
  }
}

/**
 * 로컬 세션(User)을 부분 업데이트합니다.
 * - 기존 세션의 user를 읽어 필요한 필드만 병합 저장
 */
async function updateLocalUser(partial: Partial<User & { gender?: GenderCode }>) {
  const { user: current } = await getSession();
  if (!current) return;
  const merged: User & { gender?: GenderCode } = { ...(current as any), ...partial };
  // saveSession은 오버로드 지원: user만 전달 시 로컬 세션 사용자 정보만 갱신
  await saveSession(merged as any);
}

/**
 * 나이만 빠르게 업데이트
 */
export async function quickUpdateAge(
  age: number,
  options: QuickUpdateOptions = {},
): Promise<QuickUpdateResult<QuickUpdatedUserSlice>> {
  const { updateLocal = true } = options;
  const safeAge = sanitizeAge(age);
  if (safeAge === null) {
    return { success: false, error: "유효한 나이가 아닙니다. (1~120)" };
  }

  const idRes = await getCurrentUserId();
  if (!idRes.success || !idRes.data) return { success: false, error: idRes.error };

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ age: safeAge }) // 서버 컬럼: users.age
      .eq("id", idRes.data)
      .select("id, age, gender")
      .single();

    if (error) return { success: false, error: error.message };

    if (updateLocal) {
      await updateLocalUser({ age: data?.age ?? undefined });
    }

    return { success: true, data: data as QuickUpdatedUserSlice };
  } catch (e: any) {
    return { success: false, error: e?.message || "나이 업데이트 실패" };
  }
}

/**
 * 성별만 빠르게 업데이트
 */
export async function quickUpdateGender(
  gender: GenderInput,
  options: QuickUpdateOptions = {},
): Promise<QuickUpdateResult<QuickUpdatedUserSlice>> {
  const { updateLocal = true } = options;
  const normalized = normalizeGender(gender);

  const idRes = await getCurrentUserId();
  if (!idRes.success || !idRes.data) return { success: false, error: idRes.error };

  try {
    const { data, error } = await supabase
      .from("users")
      .update({ gender: normalized }) // 서버 컬럼: users.gender
      .eq("id", idRes.data)
      .select("id, age, gender")
      .single();

    if (error) return { success: false, error: error.message };

    if (updateLocal) {
      await updateLocalUser({ ...(data?.gender ? { gender: data.gender } : {}) });
    }

    return { success: true, data: data as QuickUpdatedUserSlice };
  } catch (e: any) {
    return { success: false, error: e?.message || "성별 업데이트 실패" };
  }
}

/**
 * 나이와 성별을 한번에 빠르게 업데이트
 * - 부분만 전달해도 됩니다.
 */
export async function quickUpdateAgeAndGender(
  input: { age?: number; gender?: GenderInput },
  options: QuickUpdateOptions = {},
): Promise<QuickUpdateResult<QuickUpdatedUserSlice>> {
  const { updateLocal = true } = options;

  const payload: { age?: number | null; gender?: GenderCode } = {};
  if (input.age !== undefined) payload.age = sanitizeAge(input.age);
  if (input.gender !== undefined) payload.gender = normalizeGender(input.gender);

  if (payload.age === null) {
    return { success: false, error: "유효한 나이가 아닙니다. (1~120)" };
  }

  if (Object.keys(payload).length === 0) {
    return { success: false, error: "업데이트할 값이 없습니다." };
  }

  const idRes = await getCurrentUserId();
  if (!idRes.success || !idRes.data) return { success: false, error: idRes.error };

  try {
    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", idRes.data)
      .select("id, age, gender")
      .single();

    if (error) return { success: false, error: error.message };

    if (updateLocal) {
      const partialLocal: Partial<User & { gender?: GenderCode }> = {};
      if (data?.age !== undefined) partialLocal.age = data.age ?? undefined;
      if (data?.gender !== undefined) (partialLocal as any).gender = data.gender ?? undefined;
      if (Object.keys(partialLocal).length > 0) {
        await updateLocalUser(partialLocal);
      }
    }

    return { success: true, data: data as QuickUpdatedUserSlice };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || "나이/성별 업데이트 실패",
    };
  }
}

/**
 * 사용 예시
 * -------------
 * // 나이만 업데이트
 * await quickUpdateAge(27);
 *
 * // 성별만 업데이트
 * await quickUpdateGender("female");
 *
 * // 나이/성별 동시에 업데이트
 * await quickUpdateAgeAndGender({ age: 31, gender: "남" });
 */
