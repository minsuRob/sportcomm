/**
 * 글로벌 Refresh Event Bus
 * =========================================
 * 목적:
 *  - 다양한 화면/데이터소스(피드, 알림, 채팅, 프로필 등)의 새로고침 트리거를
 *    한 곳에서 관리하고 재사용/확장 가능하게 하기 위함
 *
 * 특징:
 *  1) 가벼운 pub/sub (외부 상태관리 라이브러리 의존 없음)
 *  2) 키 단위(refreshKey)로 구독/트리거 (예: 'feed', 'notifications', 'chatRooms')
 *  3) 동일 키 다수 핸들러 등록 가능
 *  4) async 핸들러 지원 (Promise 병렬 실행 후 완료 대기)
 *  5) 트리거 호출 시 옵션으로 중복 억제(throttle) / 지연(debounce) 가능
 *  6) 전체 글로벌 구독자(onAny) 지원
 *  7) 안정성: 개별 핸들러 오류는 다른 핸들러 실행에 영향 주지 않음
 *
 * 사용 예 (Feed 새로고침):
 *  import { onRefresh, triggerRefresh } from "@/lib/refresh/refreshBus";
 *
 *  // 피드 컴포넌트 마운트 시
 *  const unsubscribe = onRefresh("feed", async (ctx) => {
 *    await refetchFeed(); // 실제 피드 refetch 로직
 *  });
 *
 *  // 업로드 완료 시
 *  await triggerRefresh("feed", { reason: "post_upload_completed" });
 *
 * 확장 계획:
 *  - 필요 시 우선순위(priority) / 그룹핑(group) 추가
 *  - 최근 실행 시간 조회 API, 모니터링 hook (useRefreshStats) 추가
 */

export type RefreshKey = string;

export interface RefreshContext {
  key: RefreshKey;
  reason?: string;
  source?: string;
  meta?: Record<string, any>;
  triggeredAt: number;
  attempt: number;
  // 향후 확장 필드 (예: correlationId 등)
}

export type RefreshHandler = (ctx: RefreshContext) => void | Promise<void>;

interface HandlerEntry {
  handler: RefreshHandler;
  id: string;
  createdAt: number;
}

interface ThrottleState {
  lastExecuted: number;
  scheduled?: number;
  pendingContext?: RefreshContext;
}

interface TriggerOptions {
  reason?: string;
  source?: string;
  meta?: Record<string, any>;

  /**
   * throttleMs:
   *  - 설정 시 해당 키는 마지막 실행 후 throttleMs 이전 재호출 요청이 오면
   *    즉시 실행하지 않고 무시 (또는 필요한 경우 queue 로직 확장 가능)
   */
  throttleMs?: number;

  /**
   * debounceMs:
   *  - 설정 시 동일 키로 들어오는 연속 호출을 debounceMs 뒤 한 번만 실행
   *  - throttle 과 동시에 사용 시: throttle 체크 → debounce 스케줄
   */
  debounceMs?: number;
}

interface RefreshBusConfig {
  devLog?: boolean;
}

const DEFAULT_CONFIG: RefreshBusConfig = {
  devLog: process.env.NODE_ENV !== "production",
};

/**
 * RefreshBus 싱글톤 클래스
 */
class RefreshBus {
  private handlers: Map<RefreshKey, Set<HandlerEntry>> = new Map();
  private anyHandlers: Set<HandlerEntry> = new Set();
  private throttleState: Map<RefreshKey, ThrottleState> = new Map();
  private attemptCounter = 0;
  private config: RefreshBusConfig;

  constructor(config?: Partial<RefreshBusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private log(...args: any[]) {
    if (this.config.devLog) {
      // eslint-disable-next-line no-console
      console.log("[RefreshBus]", ...args);
    }
  }

  private genId(): string {
    return (
      "rfx_" +
      Math.random().toString(36).slice(2, 9) +
      "_" +
      Date.now().toString(36)
    );
  }

  on(key: RefreshKey, handler: RefreshHandler): () => void {
    const entry: HandlerEntry = {
      handler,
      id: this.genId(),
      createdAt: Date.now(),
    };
    if (!this.handlers.has(key)) {
      this.handlers.set(key, new Set());
    }
    this.handlers.get(key)!.add(entry);
    this.log("handler registered", key, entry.id);
    return () => {
      this.handlers.get(key)?.delete(entry);
      this.log("handler unregistered", key, entry.id);
    };
  }

  /**
   * 모든 키 이벤트를 수신 (모니터링/로깅/글로벌 반응)
   */
  onAny(handler: RefreshHandler): () => void {
    const entry: HandlerEntry = {
      handler,
      id: this.genId(),
      createdAt: Date.now(),
    };
    this.anyHandlers.add(entry);
    this.log("any-handler registered", entry.id);
    return () => {
      this.anyHandlers.delete(entry);
      this.log("any-handler unregistered", entry.id);
    };
  }

  /**
   * 내부: 실제 실행 수행
   */
  private async executeHandlers(ctx: RefreshContext) {
    const list = Array.from(this.handlers.get(ctx.key) ?? []);
    const anyList = Array.from(this.anyHandlers);

    if (list.length === 0 && anyList.length === 0) {
      this.log("no handlers for key", ctx.key);
      return;
    }

    this.log(
      "trigger",
      ctx.key,
      `handlers=${list.length}`,
      `any=${anyList.length}`,
      ctx.reason || "",
    );

    const run = async (entry: HandlerEntry, isAny: boolean) => {
      try {
        await entry.handler(ctx);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "[RefreshBus] handler error",
          ctx.key,
          isAny ? "(any)" : "",
          err,
        );
      }
    };

    // 병렬 실행
    await Promise.all([
      ...list.map((e) => run(e, false)),
      ...anyList.map((e) => run(e, true)),
    ]);
  }

  /**
   * Throttle / Debounce 처리
   */
  private scheduleTrigger(key: RefreshKey, options: TriggerOptions): void {
    const state = this.throttleState.get(key) || {
      lastExecuted: 0,
      scheduled: undefined,
      pendingContext: undefined,
    };

    const now = Date.now();

    // Throttle: 일정 시간 내 중복 실행 차단
    if (options.throttleMs) {
      const elapsed = now - state.lastExecuted;
      if (elapsed < options.throttleMs) {
        this.log(
          "throttle skip",
            key,
            `${elapsed}ms < ${options.throttleMs}ms`,
        );
        return;
      }
    }

    // context 구성
    const ctx: RefreshContext = {
      key,
      reason: options.reason,
      source: options.source,
      meta: options.meta,
      triggeredAt: now,
      attempt: ++this.attemptCounter,
    };

    // Debounce: 최근 요청만 지연 실행
    if (options.debounceMs) {
      state.pendingContext = ctx;
      if (state.scheduled) {
        clearTimeout(state.scheduled);
      }
      state.scheduled = setTimeout(async () => {
        const pending = state.pendingContext;
        state.pendingContext = undefined;
        state.scheduled = undefined;
        state.lastExecuted = Date.now();
        await this.executeHandlers(pending!);
      }, options.debounceMs) as unknown as number;
      this.throttleState.set(key, state);
      return;
    }

    // 즉시 실행
    state.lastExecuted = now;
    this.throttleState.set(key, state);
    void this.executeHandlers(ctx);
  }

  /**
   * 단일 키 Refresh 트리거
   */
  trigger(key: RefreshKey, options: TriggerOptions = {}): void {
    this.scheduleTrigger(key, options);
  }

  /**
   * 여러 키를 순차 트리거
   */
  triggerMany(
    keys: RefreshKey[],
    sharedOptions: TriggerOptions = {},
  ): void {
    keys.forEach((k) => this.scheduleTrigger(k, sharedOptions));
  }
}

/* =========================
 * 싱글톤 인스턴스 & 퍼블릭 API
 * ========================= */

const refreshBus = new RefreshBus();

/**
 * 특정 키 구독
 */
export function onRefresh(
  key: RefreshKey,
  handler: RefreshHandler,
): () => void {
  return refreshBus.on(key, handler);
}

/**
 * 모든 키(global) 구독
 */
export function onAnyRefresh(handler: RefreshHandler): () => void {
  return refreshBus.onAny(handler);
}

/**
 * 단일 키 새로고침 트리거
 */
export function triggerRefresh(
  key: RefreshKey,
  options?: TriggerOptions,
): void {
  refreshBus.trigger(key, options);
}

/**
 * 다중 키 새로고침 트리거
 */
export function triggerRefreshMany(
  keys: RefreshKey[],
  options?: TriggerOptions,
): void {
  refreshBus.triggerMany(keys, options);
}

/**
 * (선택) 개발 디버그용 전역 노출
 */
declare global {
  // eslint-disable-next-line no-var
  var __REFRESH_BUS__: any;
}

if (typeof globalThis !== "undefined" && !globalThis.__REFRESH_BUS__) {
  globalThis.__REFRESH_BUS__ = {
    triggerRefresh,
    triggerRefreshMany,
    onRefresh,
    onAnyRefresh,
    _bus: refreshBus,
  };
}
