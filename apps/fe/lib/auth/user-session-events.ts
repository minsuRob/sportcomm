/**
 * 사용자 세션 이벤트 브로드캐스터
 * --------------------------------------------
 * 목적:
 *  - 로그인 / 로그아웃 / 토큰 갱신 / 사용자 정보 변경 등의 세션 변화를
 *    전역에서 구독(subscribe)하고 즉시 UI에 반영하기 위한 경량 Event Emitter.
 *
 * 특징:
 *  - React/비 React 환경 모두 사용 가능 (훅 아님)
 *  - 의존성 최소화 (Node EventEmitter 비사용, 간단 구현)
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

import type { User } from "./auth";

/** 세션 변경 이유(카테고리) */
export type SessionChangeReason =
  | "login"
  | "logout"
  | "refresh"
  | "update"
  | "bootstrap";

/** 세션 변경 이벤트 페이로드 */
export interface SessionChangeEvent {
  user: User | null;
  token: string | null;
  reason: SessionChangeReason;
  at: number; // 타임스탬프 (ms)
}

/** 리스너 함수 타입 */
export type SessionChangeListener = (event: SessionChangeEvent) => void;

/** 내부 리스너 저장소 (중복 추가 방지 위해 Set 사용) */
const listeners = new Set<SessionChangeListener>();

/** 마지막으로 브로드캐스트된 이벤트 (신규 구독자에게 즉시 제공 목적) */
let lastEvent: SessionChangeEvent | null = null;

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
  if (replayLast && lastEvent) {
    try {
      listener(lastEvent);
    } catch (e) {
      // 개별 리스너 예외는 전체 흐름 방해하지 않음
      console.warn("세션 리스너 즉시 재생(replay) 중 오류:", e);
    }
  }
  return () => offSessionChange(listener);
}

/**
 * 1회성 구독 (이벤트 한 번 수신 후 자동 해제)
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
 */
export function offSessionChange(listener: SessionChangeListener): void {
  listeners.delete(listener);
}

/**
 * 세션 변경 브로드캐스트
 * - saveSession / clearSession / 토큰 갱신 등 로직에서 호출
 * - try/catch 로 개별 리스너 예외 분리
 */
export function emitSessionChange(payload: {
  user: User | null;
  token: string | null;
  reason: SessionChangeReason;
}): void {
  const event: SessionChangeEvent = {
    ...payload,
    at: Date.now(),
  };
  lastEvent = event;

  // 얕은 복사로 순회 안전성 확보 (리스너가 내부에서 off 호출할 수 있음)
  [...listeners].forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.warn("세션 리스너 실행 중 오류:", err);
    }
  });
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
 * @returns 로그인 성공 시 User, 타임아웃/로그아웃 시 null
 */
export function waitForLogin(timeoutMs: number = 8000): Promise<User | null> {
  // 이미 로그인 상태라면 즉시 resolve
  if (lastEvent?.user) return Promise.resolve(lastEvent.user);

  return new Promise<User | null>((resolve) => {
    const timer = setTimeout(() => {
      off();
      resolve(null);
    }, timeoutMs);

    const off = onSessionChange(
      ({ user, reason }) => {
        if (user && reason === "login") {
          clearTimeout(timer);
          off();
          resolve(user);
        } else if (reason === "logout") {
            // 로그인 기다리는 중 로그아웃이 들어오면 계속 기다릴 수도 있으나
            // 여기서는 UX 상 명확히 null 로 반환
          clearTimeout(timer);
          off();
          resolve(null);
        }
      },
      true,
    );
  });
}

/**
 * 세션 초기 부트스트랩 시(앱 시작 시점) 명시적으로 호출 가능
 * - user/session 스냅샷을 외부에서 불러온 직후 브로드캐스트
 */
export function bootstrapSession(user: User | null, token: string | null) {
  emitSessionChange({
    user,
    token,
    reason: "bootstrap",
  });
}

/**
 * 디버그 헬퍼 - 현재 리스너 수 반환
 */
export function getSessionListenerCount(): number {
  return listeners.size;
}

/**
 * 선택: 테스트 환경 초기화 (Jest 등)
 */
export function __resetSessionEventsForTest() {
  listeners.clear();
  lastEvent = null;
}

/*
커밋 메시지 (git): feat(auth): 사용자 세션 전역 이벤트 브로드캐스터 추가 (login/logout 즉시 반영용)
*/
