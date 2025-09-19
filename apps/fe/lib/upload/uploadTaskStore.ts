/**
 * 글로벌 업로드 태스크 상태 관리 스토어 (alias 경로: "@/lib/upload/uploadTaskStore")
 *
 * 무한 렌더(업데이트 깊이 초과) 방지를 위해 아래 최적화 적용:
 *  1) snapshot 캐시 (dirty 플래그 기반 재생성)
 *  2) 변경 없을 때 emit 차단
 *  3) emit 마이크로태스크 배치
 */
import { useSyncExternalStore, useMemo } from "react";

/* =========================
 * 타입 정의
 * ========================= */
export type UploadTaskStatus = "pending" | "uploading" | "success" | "error";

export interface UploadTask {
  id: string;
  type: string;
  title?: string;
  status: UploadTaskStatus;
  progress: number;
  message?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  meta?: Record<string, any>;
}

export interface CreateUploadTaskInput {
  type: string;
  title?: string;
  initialMessage?: string;
  meta?: Record<string, any>;
}

interface UploadTaskStoreState {
  tasks: Map<string, UploadTask>;
}

/* =========================
 * 내부 유틸
 * ========================= */
const now = () => Date.now();

function generateId(): string {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    (globalThis as any).crypto?.randomUUID
  ) {
    return (globalThis as any).crypto.randomUUID();
  }
  return (
    "task_" + Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
  );
}

/* =========================
 * 스토어 싱글톤
 * ========================= */
class UploadTaskStore {
  private state: UploadTaskStoreState = { tasks: new Map() };

  private listeners = new Set<() => void>();
  private emitScheduled = false;

  // snapshot 캐시
  private dirty = true;
  private cachedSnapshot: UploadTask[] = [];

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    queueMicrotask(() => {
      this.emitScheduled = false;
      // dirty 플래그는 외부 변경 메서드(update/finalize/remove 등)에서 세팅
      for (const l of this.listeners) l();
    });
  }

  private rebuildSnapshot() {
    this.cachedSnapshot = Array.from(this.state.tasks.values()).sort(
      (a, b) => a.createdAt - b.createdAt,
    );
    this.dirty = false;
  }

  getSnapshot(): UploadTask[] {
    if (this.dirty) {
      this.rebuildSnapshot();
    }
    return this.cachedSnapshot;
  }

  create(input: CreateUploadTaskInput): string {
    const id = generateId();
    const task: UploadTask = {
      id,
      type: input.type,
      title: input.title,
      status: "pending",
      progress: 0,
      message: input.initialMessage,
      createdAt: now(),
      updatedAt: now(),
      meta: input.meta,
    };
    this.state.tasks.set(id, task);
    this.dirty = true;
    this.emit();
    return id;
  }

  update(id: string, progress: number, message?: string) {
    const task = this.state.tasks.get(id);
    if (!task) return;

    const nextProgress = Math.min(Math.max(progress, 0), 100);
    const nextMessage = message ?? task.message;

    const prevStatus = task.status;
    const prevProgress = task.progress;
    const prevMessage = task.message;

    let nextStatus: UploadTaskStatus = task.status;
    if (nextStatus === "pending" && nextProgress > 0) {
      nextStatus = "uploading";
    } else if (nextStatus === "uploading" && nextProgress >= 100) {
      nextStatus = "success";
    }

    const changed =
      prevStatus !== nextStatus ||
      prevProgress !== nextProgress ||
      prevMessage !== nextMessage;

    if (!changed) return;

    task.progress = nextProgress;
    task.message = nextMessage;
    task.status = nextStatus;
    task.updatedAt = now();

    this.state.tasks.set(id, task);
    this.dirty = true;
    this.emit();

    if (nextStatus === "success" && prevStatus !== "success") {
      this.scheduleAutoRemove(id, 1500);
    }
  }

  finalize(id: string, success: boolean, errorMessage?: string) {
    const task = this.state.tasks.get(id);
    if (!task) return;

    const targetStatus: UploadTaskStatus = success ? "success" : "error";
    const targetProgress = success ? 100 : task.progress;
    const targetErrorMessage = success
      ? undefined
      : errorMessage || task.errorMessage;

    const prevStatus = task.status;
    const prevProgress = task.progress;
    const prevErr = task.errorMessage;

    const changed =
      prevStatus !== targetStatus ||
      prevProgress !== targetProgress ||
      prevErr !== targetErrorMessage;

    if (!changed) return;

    task.status = targetStatus;
    task.progress = targetProgress;
    task.errorMessage = targetErrorMessage;
    task.updatedAt = now();

    this.state.tasks.set(id, task);
    this.dirty = true;
    this.emit();

    this.scheduleAutoRemove(id, success ? 1500 : 5000);
  }

  remove(id: string) {
    if (this.state.tasks.delete(id)) {
      this.dirty = true;
      this.emit();
    }
  }

  private scheduleAutoRemove(id: string, delayMs: number) {
    setTimeout(() => {
      const task = this.state.tasks.get(id);
      if (!task) return;
      if (task.status === "success" || task.status === "error") {
        this.remove(id);
      }
    }, delayMs);
  }
}

const uploadTaskStore = new UploadTaskStore();

/* =========================
 * 퍼블릭 API
 * ========================= */
export function createUploadTask(input: CreateUploadTaskInput): string {
  return uploadTaskStore.create(input);
}

export function updateUploadTask(
  id: string,
  progress: number,
  message?: string,
): void {
  uploadTaskStore.update(id, progress, message);
}

export function finalizeUploadTask(
  id: string,
  success: boolean,
  errorMessage?: string,
): void {
  uploadTaskStore.finalize(id, success, errorMessage);
}

export function removeUploadTask(id: string): void {
  uploadTaskStore.remove(id);
}

/* =========================
 * React Hooks
 * ========================= */
export function useUploadTasks(): UploadTask[] {
  return useSyncExternalStore(
    (listener) => uploadTaskStore.subscribe(listener),
    () => uploadTaskStore.getSnapshot(),
    () => uploadTaskStore.getSnapshot(),
  );
}

export function useUploadTask(id: string | undefined): UploadTask | undefined {
  const tasks = useUploadTasks();
  return useMemo(() => tasks.find((t) => t.id === id), [tasks, id]);
}

export function useActiveUploadTasks(): UploadTask[] {
  const tasks = useUploadTasks();
  return useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.status === "pending" ||
          t.status === "uploading" ||
          (t.status === "success" && t.progress < 100) ||
          t.status === "error",
      ),
    [tasks],
  );
}

export function useLastErrorUploadTask(): UploadTask | undefined {
  const tasks = useUploadTasks();
  return useMemo(
    () =>
      [...tasks]
        .filter((t) => t.status === "error")
        .sort((a, b) => b.updatedAt - a.updatedAt)[0],
    [tasks],
  );
}

/* =========================
 * 디버깅 헬퍼 (개발 환경)
 * ========================= */
declare global {
  // eslint-disable-next-line no-var
  var __UPLOAD_TASK_DEBUG__: any;
}

if (
  typeof globalThis !== "undefined" &&
  process.env.NODE_ENV !== "production"
) {
  (globalThis as any).__UPLOAD_TASK_DEBUG__ = {
    createUploadTask,
    updateUploadTask,
    finalizeUploadTask,
    removeUploadTask,
    getAll: () => uploadTaskStore.getSnapshot(),
  };
}
