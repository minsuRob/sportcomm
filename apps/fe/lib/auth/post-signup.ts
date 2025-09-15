/**
 * post-signup 유틸: 회원가입 직후(또는 첫 로그인 직후) 후속 온보딩 플로우 판단/관리
 *
 * 목표
 * - 모든 인증 provider(이메일/구글/애플 등)에서 공통으로 사용할 수 있는 후속 플로우 결정 로직 제공
 * - "한 번 완료한 단계는 다시 뜨지 않도록" 로컬 플래그(AsyncStorage)로 상태 관리
 * - 사용자 상태 기반(나이/성별/선호팀 등)으로 다음 라우트 결정
 *
 * 사용 예시
 *  import {
 *    shouldRunPostSignup,
 *    getNextPostSignupRoute,
 *    markPostSignupStepDone,
 *  } from "@/lib/auth/post-signup";
 *
 *  const need = await shouldRunPostSignup(user);
 *  if (need) {
 *    const route = await getNextPostSignupRoute(user);
 *    if (route) router.replace(route);
 *  } else {
 *    router.replace("/(app)/feed");
 *  }
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================
 * 타입 및 상수
 * ========================= */

/**
 * 최소 사용자 타입(외부 모듈 의존 최소화)
 * - 실제 User 타입과 100% 일치할 필요 없이, 본 유틸이 판단에 사용하는 필드만 명시
 */
export type MinimalUser = {
  id: string;
  nickname?: string | null;
  email?: string | null;
  role?: string | null;
  provider?: string | null;
  profileImageUrl?: string | null;

  // 온보딩 판단 관련 필드 (선택)
  age?: number | null;
  gender?: "M" | "F" | "O" | string | null;

  // 팀 선택 여부 판단 (실제 구조는 프로젝트 상황에 맞게 any 로 수용)
  myTeams?: any[] | null;
};

/**
 * 포스트 사인업 단계
 * - 필요한 단계가 늘어나면 여기 Enum에만 추가해도 유연히 확장 가능
 */
export enum PostSignupStep {
  Profile = "profile", // 나이/성별 등 기본 프로필 입력
  Teams = "teams", // 선호 팀 선택
}

/**
 * 로컬 저장 상태 스키마
 * - 완료한 단계 기록 + 스킵/억제 정보(선택)
 */
export interface PostSignupState {
  version: number;
  completedSteps: PostSignupStep[];
  // 최근 프롬프트 시각(디버그/억제 로직 참고용)
  lastPromptAt: string | null;
  // 프롬프트 억제 시각(이 시각 이전에는 프롬프트 안뜸) - 선택
  suppressedUntil?: string | null;
}

/**
 * 저장 키
 */
const STORAGE_KEYS = {
  STATE: "@post-signup/state/v1",
} as const;

/**
 * 기본 상태값
 */
const DEFAULT_STATE: PostSignupState = {
  version: 1,
  completedSteps: [],
  lastPromptAt: null,
  suppressedUntil: null,
};

/* =========================
 * 내부 유틸 함수
 * ========================= */

/**
 * JSON 파싱 안전 헬퍼
 */
function parseJSONSafe<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * 날짜 문자열을 Date로 안전 변환
 */
function toDateOrNull(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* =========================
 * 상태 로드/저장
 * ========================= */

/**
 * 현재 post-signup 상태 로드
 */
export async function getPostSignupState(): Promise<PostSignupState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STATE);
    const state = parseJSONSafe<PostSignupState>(raw, DEFAULT_STATE);
    // 유효성 보정
    return {
      ...DEFAULT_STATE,
      ...state,
      completedSteps: Array.isArray(state.completedSteps)
        ? (state.completedSteps as PostSignupStep[])
        : [],
    };
  } catch {
    // 스토리지 접근 실패 시 기본 상태 반환
    return { ...DEFAULT_STATE };
  }
}

/**
 * post-signup 상태 저장(병합)
 */
export async function setPostSignupState(
  patch: Partial<PostSignupState>,
): Promise<void> {
  try {
    const current = await getPostSignupState();
    const next: PostSignupState = {
      ...current,
      ...patch,
      // completedSteps는 병합(중복 제거)
      completedSteps: patch.completedSteps
        ? Array.from(new Set([...current.completedSteps, ...patch.completedSteps]))
        : current.completedSteps,
    };
    await AsyncStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(next));
  } catch {
    // 저장 실패는 무시(UX 저하 방지), 필요 시 로깅 추가 가능
  }
}

/**
 * 특정 단계 완료 처리
 */
export async function markPostSignupStepDone(
  step: PostSignupStep,
): Promise<void> {
  const state = await getPostSignupState();
  if (state.completedSteps.includes(step)) return;
  await setPostSignupState({
    completedSteps: [...state.completedSteps, step],
  });
}

/**
 * 모든 단계 완료 처리(선택 API)
 */
export async function markPostSignupAllDone(): Promise<void> {
  await setPostSignupState({
    completedSteps: [PostSignupStep.Profile, PostSignupStep.Teams],
  });
}

/**
 * 프롬프트 억제(예: "나중에 할게요" 클릭 시 일정 시간 억제)
 */
export async function suppressPostSignupPrompt(
  durationMs: number = 60 * 60 * 1000, // 1시간 기본
): Promise<void> {
  const until = new Date(Date.now() + durationMs).toISOString();
  await setPostSignupState({ suppressedUntil: until });
}

/**
 * 프롬프트 억제 해제
 */
export async function clearPostSignupSuppression(): Promise<void> {
  await setPostSignupState({ suppressedUntil: null });
}

/**
 * 상태 전체 초기화(디버그/테스트용)
 */
export async function resetPostSignupState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.STATE);
}

/* =========================
 * 판단 로직
 * ========================= */

/**
 * 프로필(나이/성별 등) 보완 필요 여부 판단
 * - 나이 범위: 1~120을 정상값으로 가정
 * - gender는 M/F/O 중 하나면 정상으로 가정(대소문자 허용)
 */
export function needsProfileCompletion(user: MinimalUser | null): boolean {
  if (!user) return true; // 사용자 정보 없으면 보완 필요로 간주

  // 나이 체크(선택 입력이지만, 온보딩 유도)
  const age = typeof user.age === "number" ? user.age : null;
  const isAgeValid = age === null || (age >= 1 && age <= 120);

  // 성별 체크(선택 입력이지만, 온보딩 유도)
  const gender = (user.gender || "").toString().toUpperCase();
  const isGenderValid = gender === "" || ["M", "F", "O"].includes(gender);

  // 이미 프로필 단계 완료되었는지(로컬 스킵/완료 처리) 여부는 상태에서 관리
  // 여기서는 "필드 관점"으로만 부족한지 판단
  // 규칙: age/gender 둘 다 없으면 보완 유도, 값이 있더라도 비정상이면 유도
  const missingAge = age === null;
  const missingGender = gender === "";

  if (!isAgeValid || !isGenderValid) return true;
  if (missingAge && missingGender) return true;

  return false;
}

/**
 * 팀 선택 필요 여부 판단
 * - myTeams가 없거나 빈 배열이면 필요
 */
export function needsTeamSelection(user: MinimalUser | null): boolean {
  if (!user) return true;
  const teams = Array.isArray(user.myTeams) ? user.myTeams : [];
  return teams.length === 0;
}

/**
 * 현재 억제 상태인지 확인
 */
export async function isPostSignupSuppressed(): Promise<boolean> {
  const state = await getPostSignupState();
  const until = toDateOrNull(state.suppressedUntil);
  if (!until) return false;
  return Date.now() < until.getTime();
}

/**
 * post-signup이 필요한지 최종 판단(플래그 + 사용자 상태 + 억제 상태)
 */
export async function shouldRunPostSignup(
  user: MinimalUser | null,
): Promise<boolean> {
  // 억제 중이면 자동으로 띄우지 않음
  if (await isPostSignupSuppressed()) return false;

  const state = await getPostSignupState();
  const profileDone = state.completedSteps.includes(PostSignupStep.Profile);
  const teamsDone = state.completedSteps.includes(PostSignupStep.Teams);

  const needProfile = needsProfileCompletion(user) && !profileDone;
  const needTeams = needsTeamSelection(user) && !teamsDone;

  // 최근 프롬프트 시간 기록(참고용)
  await setPostSignupState({ lastPromptAt: new Date().toISOString() });

  return needProfile || needTeams;
}

/**
 * 다음에 실행할 post-signup 단계 결정
 * - 여러 단계가 동시에 필요하면 Profile -> Teams 순으로 안내
 */
export async function getNextPostSignupStep(
  user: MinimalUser | null,
): Promise<PostSignupStep | null> {
  const state = await getPostSignupState();

  if (needsProfileCompletion(user) && !state.completedSteps.includes(PostSignupStep.Profile)) {
    return PostSignupStep.Profile;
  }
  if (needsTeamSelection(user) && !state.completedSteps.includes(PostSignupStep.Teams)) {
    return PostSignupStep.Teams;
  }
  return null;
}

/**
 * 다음에 이동할 라우트 반환
 * - null 이면 바로 피드로 보내면 됨
 */
export async function getNextPostSignupRoute(
  user: MinimalUser | null,
): Promise<string | null> {
  const step = await getNextPostSignupStep(user);
  if (step === PostSignupStep.Profile) {
    // 나이/성별 경량 설정 모달(이미 구현됨)
    return "/(modals)/post-signup-profile";
  }
  if (step === PostSignupStep.Teams) {
    // 팀 선택 모달(이미 구현됨)
    return "/(modals)/team-selection";
  }
  return null;
}

/* =========================
 * 고급: Provider 별 커스텀 훅/확장 포인트
 * ========================= */

/**
 * Provider 별로 post-signup 필요 여부를 미세 조정하려면 본 함수를 사용하세요.
 * - 예: 특정 provider는 Profile 단계를 항상 스킵하고 Team만 요구하도록 등
 * - 기본은 모든 provider 동일 로직 (providerAware=false)
 */
export async function shouldRunPostSignupProviderAware(
  user: MinimalUser | null,
  options?: {
    providerAware?: boolean;
    // provider 이름을 대문자로 비교 ex) GOOGLE, APPLE, EMAIL
    overrides?: Partial<
      Record<
        string,
        {
          forceProfile?: boolean; // provider별 profile 강제 유도
          skipProfile?: boolean; // provider별 profile 스킵
          forceTeams?: boolean; // provider별 teams 강제 유도
          skipTeams?: boolean; // provider별 teams 스킵
        }
      >
    >;
  },
): Promise<boolean> {
  const aware = options?.providerAware ?? false;
  if (!aware) return shouldRunPostSignup(user);

  const provider = (user?.provider || "").toString().toUpperCase();
  const ov = options?.overrides?.[provider];

  const state = await getPostSignupState();
  const profileDone = state.completedSteps.includes(PostSignupStep.Profile);
  const teamsDone = state.completedSteps.includes(PostSignupStep.Teams);

  // 기본 판단
  let needProfile = needsProfileCompletion(user) && !profileDone;
  let needTeams = needsTeamSelection(user) && !teamsDone;

  // override 적용
  if (ov?.forceProfile) needProfile = true;
  if (ov?.skipProfile) needProfile = false;
  if (ov?.forceTeams) needTeams = true;
  if (ov?.skipTeams) needTeams = false;

  // 억제 체크
  if (await isPostSignupSuppressed()) return false;

  await setPostSignupState({ lastPromptAt: new Date().toISOString() });

  return needProfile || needTeams;
}

/* =========================
 * 설명
 * =========================
 * - 본 유틸은 "사용자 상태 + 로컬 완료 플래그"를 조합하여 post-signup(온보딩) 필요 여부를 판단합니다.
 * - 단계는 확장 가능하며, provider 별로 미세한 정책(강제/스킵)을 적용할 수 있는 API를 제공합니다.
 * - 라우팅은 getNextPostSignupRoute(user)로 결정하여, 호출부에서 router.replace(...)만 호출하면 됩니다.
 *
 * 타입 힌트
 * - 모든 외부 노출 함수는 명시적 반환 타입을 포함합니다.
 *
 * 오류 처리
 * - 스토리지 접근 실패 시 기본값으로 동작하여 UX 저하를 최소화합니다.
 *
 * 성능
 * - 상태 로드는 필요한 시점에만 호출하며, 간단한 병합/검증으로 부담을 줄였습니다.
 */
