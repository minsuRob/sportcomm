/**
 * 사용자 세션 이벤트 브로드캐스터 (외부 타입 의존 제거판)
 * ---------------------------------------------------
 * 목적:
 *  - 로그인/로그아웃/토큰 갱신/사용자 정보 변경 등 세션 변화를
 *    전역에서 구독하고 즉시 UI에 반영하기 위한 경량 Event Emitter
 *
 * 특징:
 *  - React/비 React 환경 모두 사용 가능 (훅 아님)
 *  - 외부 User 타입과의 구조 충돌 방지를 위해 최소 SessionUser 타입만 노출
 *  - 메모리 누수 방지를 위해 반드시 반환된 unsubscribe 호출 권장
 *
 * 사용 예:
 *  import {
 *    onSessionChange,
 *    emitSessionChange,
 *  } from "@/lib/auth/user-session-events";
 *
 *  // 구독 (컴포넌트 마운트 시)
 *  useEffect(() => {
 *    const off = onSessionChange(({ user, reason }) => {
 *      console.log("세션 변경:", reason, user);
 *      setCurrentUser(user);
 *    });
 *    return off; // 언마운트 시 구독 해제
 *  }, []);
 *
 *  // 로그인 직후
 *  emitSessionChange({ user: loggedInUser, token, reason: "login" });
 *
 *  // 로그아웃 직후
 *  emitSessionChange({ user: null, token: null, reason: "logout" });
 */

/**
 * 최소 사용자 타입
 * - 외부 모듈의 User 타입과 충돌하지 않도록 핵심 필드만 정의
 * - 확장 필드는 인덱스 시그니처로 수용
 */
export interface SessionUser {
  /** 고유 사용자 ID */
  id: string;
  /** 표시용 닉네임 */
  nickname: string;
  /** 선택: 이메일 */
  email?: string | null;
  /** 선택: 역할(Role) */
  role?: string | null;
  /** 선택: 프로필 이미지 URL */
  profileImageUrl?: string | null;
  /** 선택: 한 줄 소개 */
  bio?: string | null;
  /** 선택: 그 외 추가 필드 수용 (백엔드/클라이언트별 상이한 스키마 호환) */
  [key: string]: unknown;
}

/** 세션 변경 이유(카테고리) */
export type SessionChangeReason =
  | "login"
  | "logout"
  | "refresh"
  | "update"
  | "bootstrap";

/** 세션 변경 이벤트 페이로드 */
export interface SessionChangeEvent {
  /** 현재 로그인 사용자 (없으면 null) */
  user: SessionUser | null;
  /** 현재 액세스 토큰 (없으면 null) */
  token: string | null;
  /** 변경 사유 */
  reason: SessionChangeReason;
  /** 이벤트 발생 시각(ms) */
  at: number;
}

/** 리스너 함수 타입 */
export type SessionChangeListener = (event: SessionChangeEvent) => void;

/** 내부 리스너 저장소 (중복 추가 방지 위해 Set 사용) */
const listeners = new Set<SessionChangeListener>();

/** 마지막으로 브로드캐스트된 이벤트 (신규 구독자에게 즉시 제공 목적) */
let lastEvent: SessionChangeEvent | null = null;

/**
 * 안전 실행(개별 리스너 예외는 전체 흐름 방해하지 않음)
 */
function safeCall(listener: SessionChangeListener, event: SessionChangeEvent) {
  try {
    listener(event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[user-session-events] 리스너 실행 중 오류:", err);
  }
}

/**
 * 세션 변경 이벤트 구독
 * - 즉시 마지막 이벤트 재전달 옵션 제공
 * @param listener 리스너 함수
 * @param replayLast true 시 기존 마지막 이벤트 즉시 1회 실행
 * @returns unsubscribe 함수
 */
export function onSessionChange(
  listener: SessionChangeListener,
  replayLast: boolean = true,
): () => void {
  listeners.add(listener);

  // 신규 리스너에 마지막 이벤트 재전달 (옵션)
  if (replayLast && lastEvent) {
    safeCall(listener, lastEvent);
  }

  // 구독 해제 함수 반환
  return () => offSessionChange(listener);
}

/**
 * 1회성 구독 (이벤트 한 번 수신 후 자동 해제)
 * @param listener 리스너 함수
 * @returns 내부적으로 등록된 리스너를 해제하는 함수(필요시 수동 해제 가능)
 */
export function onceSessionChange(listener: SessionChangeListener): () => void {
  const wrapper: SessionChangeListener = (evt) => {
    try {
      listener(evt);
    } finally {
      offSessionChange(wrapper);
    }
  };
  return onSessionChange(wrapper, false);
}

/**
 * 구독 해제
 * @param listener 제거할 리스너
 */
export function offSessionChange(listener: SessionChangeListener): void {
  listeners.delete(listener);
}

/**
 * 세션 변경 브로드캐스트
 * - saveSession / clearSession / 토큰 갱신 등 로직에서 호출
 * - 얕은 복사로 순회 안전성 확보 (리스너가 내부에서 off 호출할 수 있음)
 */
export function emitSessionChange(payload: {
  user: SessionUser | null;
  token: string | null;
  reason: SessionChangeReason;
}): void {
  const event: SessionChangeEvent = {
    ...payload,
    at: Date.now(),
  };

  lastEvent = event;

  // 리스너 스냅샷 기반 브로드캐스트
  const snapshot = Array.from(listeners);
  for (const l of snapshot) {
    safeCall(l, event);
  }
}

/**
 * 현재 마지막 세션 이벤트 조회 (없으면 null)
 * - SSR 이나 초기 상태 선언 시 참고 용
 */
export function getLastSessionEvent(): SessionChangeEvent | null {
  return lastEvent;
}

/**
 * 로그인 완료를 기다리는 Promise 유틸
 * @param timeoutMs 타임아웃 (기본 8000ms)
 * @returns 로그인 성공 시 SessionUser, 타임아웃/로그아웃 시 null
 */
export function waitForLogin(
  timeoutMs: number = 8000,
): Promise<SessionUser | null> {
  // 이미 로그인 상태라면 즉시 resolve
  if (lastEvent?.user) return Promise.resolve(lastEvent.user);

  return new Promise<SessionUser | null>((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve(null);
    }, timeoutMs);

    const off = onSessionChange(({ user, reason }) => {
      if (user && reason === "login") {
        clearTimeout(timer);
        off();
        resolve(user);
      } else if (reason === "logout") {
        // 로그인 대기 중 로그아웃 수신 시 명확히 null 반환
        clearTimeout(timer);
        off();
        resolve(null);
      }
    }, true);
  });
}

/**
 * 세션 초기 부트스트랩 시(앱 시작 시점) 명시적으로 호출 가능
 * - user/session 스냅샷을 외부에서 불러온 직후 브로드캐스트
 */
export function bootstrapSession(
  user: SessionUser | null,
  token: string | null,
): void {
  emitSessionChange({ user, token, reason: "bootstrap" });
}

/**
 * 디버그 헬퍼 - 현재 리스너 수 반환
 */
export function getSessionListenerCount(): number {
  return listeners.size;
}

/**
 * 선택: 테스트 환경 초기화 (Jest 등)
 * - 리스너/마지막 이벤트 모두 초기화
 */
export function __resetSessionEventsForTest(): void {
  listeners.clear();
  lastEvent = null;
}

/*
커밋 메세지: refactor(auth): 외부 User 타입 의존 제거하고 SessionUser 최소 타입 도입으로 호환성 개선
*/
