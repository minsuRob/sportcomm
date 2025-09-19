import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  useActiveUploadTasks,
  removeUploadTask,
  UploadTask,
} from "@/lib/upload/uploadTaskStore";

/**
 * UploadTaskBar (하이브리드 진행률 표시)
 *
 * 혼합형(추천) 전략 구현:
 *  1) 준비(PENDING): 0% -> 50% 구간을 시간 기반(가짜) 진행률로 자연스럽게 채움
 *  2) 업로드(UPLOADING): 실제 업로드 progress(0~100)를 50%~90% 구간에 매핑
 *  3) 최종 처리(SUCCESS 초기): 90% -> 100% 짧은 애니메이션 (DB 등록/최종 확인)
 *
 * 에러(ERROR): 진행률 고정, 메시지 표시
 *
 * 표시 규칙:
 *  - 내부 displayedProgress 로 계산된 "표시용 퍼센트" 사용
 *  - 실제 task.progress 는 네트워크 업로드 구간만 반영
 *  - 성공 후 약간의 마무리 애니메이션 후 바 자동 제거
 */
export interface UploadTaskBarProps {
  position?: "top" | "bottom";
  onRetry?: (task: UploadTask) => void;
  visibleOverride?: boolean;
  pickTaskStrategy?: (tasks: UploadTask[]) => UploadTask | undefined;
  successAutoHideMs?: number;
  errorAutoHideMs?: number;
}

const DEFAULT_SUCCESS_HIDE_MS = 1200;
const DEFAULT_ERROR_HIDE_MS = 4500;

// 하이브리드 퍼센트 매핑 상수
const PREP_MAX = 50; // 준비 단계 최대(가짜)
const UPLOAD_MAX = 90; // 업로드 단계 종료(실제 업로드 → 스케일된 최종)
const FINAL_MIN = 90; // 최종 단계 시작
const FINAL_DURATION_MS = 600; // 90 → 100 애니메이션 시간
const PREP_INTERVAL_MS = 250; // 준비 단계 증가 간격
const PREP_STEP = 6; // 준비 단계 증가 폭 (최대 PREP_MAX 까지)

const UploadTaskBar: React.FC<UploadTaskBarProps> = ({
  position = "top",
  onRetry,
  visibleOverride,
  pickTaskStrategy,
  successAutoHideMs = DEFAULT_SUCCESS_HIDE_MS,
  errorAutoHideMs = DEFAULT_ERROR_HIDE_MS,
}) => {
  const rawTasks = useActiveUploadTasks();

  // === 안정화된 tasks (불필요 렌더 방지) ===
  const [stableTasks, setStableTasks] = useState(rawTasks);
  const lastSignatureRef = useRef<string>("");

  useEffect(() => {
    const signature = rawTasks
      .map((t) => `${t.id}:${t.status}:${t.progress}`)
      .join("|");
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      setStableTasks(rawTasks);
    }
  }, [rawTasks]);

  const tasks = stableTasks;

  // === 활성 태스크 선택 (success / error 도 표시: success 는 100% 애니메이션 후 제거) ===
  const activeTask = useMemo<UploadTask | undefined>(() => {
    if (pickTaskStrategy) return pickTaskStrategy(tasks);
    if (tasks.length === 0) return undefined;
    return [...tasks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .find(
        (t) =>
          t.status === "pending" ||
          t.status === "uploading" ||
          t.status === "success" ||
          t.status === "error",
      );
  }, [tasks, pickTaskStrategy]);

  // composite 모드: 외부(생성 로직)에서 압축+업로드 혼합 퍼센트(0~99)를 직접 전달
  const isComposite = !!activeTask?.meta?.composite;

  // === 내부 표시용 진행률 상태 (0~100) ===
  const [displayedProgress, setDisplayedProgress] = useState(0);
  const displayedProgressRef = useRef(0);

  // 마지막 외부(실제) 진행률 업데이트 시간 기록 (자동 증가 트리거용)
  const lastExternalUpdateRef = useRef<number>(Date.now());

  // displayedProgress 값이 변경될 때마다 최신 시간 기록
  useEffect(() => {
    lastExternalUpdateRef.current = Date.now();
  }, [displayedProgress]);

  /**
   * 진행률 정체(auto-stall handling)
   * - pending 또는 uploading 상태에서 1초 동안 표시 퍼센트 변화가 없으면
   *   1초마다 +5%씩 자동 증가 (최대 composite 모드는 90%, 일반은 UPLOAD_MAX)
   * - 실제 업로드 이벤트가 다시 들어오면 자동 증가는 중단(타이머는 유지되지만 조건 불충족)
   */
  useEffect(() => {
    if (!activeTask) return;
    if (!(activeTask.status === "pending" || activeTask.status === "uploading"))
      return;

    const interval = setInterval(() => {
      const now = Date.now();
      // 1초 이상 정체된 경우에만 증가
      if (now - lastExternalUpdateRef.current >= 1000) {
        setDisplayedProgress((prev) => {
          const cap = isComposite ? 90 : UPLOAD_MAX; // 자동 증가는 업로드 상한까지만
          if (prev >= cap) return prev;
          const inc = Math.floor(Math.random() * 6) + 3; // 3~8 사이 랜덤 증가
          const next = Math.min(prev + inc, cap);
          displayedProgressRef.current = next;
          // 증가 후 시간 갱신 (다음 1초 대기)
          lastExternalUpdateRef.current = Date.now();
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask, isComposite]);

  // 준비 단계 가짜 진행 타이머
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status !== "pending") return;
    const id = setInterval(() => {
      setDisplayedProgress((prev) => {
        if (prev >= PREP_MAX) return prev;
        const next = Math.min(prev + PREP_STEP, PREP_MAX);
        displayedProgressRef.current = next;
        return next;
      });
    }, PREP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [activeTask]);

  // 업로드 단계
  // - composite 모드: task.progress 값을 그대로(상승만) 사용 (0~99)
  // - 일반 모드: 실제 업로드 퍼센트를 PREP_MAX~UPLOAD_MAX 로 매핑
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status !== "uploading") return;

    if (isComposite) {
      setDisplayedProgress((prev) => {
        const next = Math.max(prev, Math.min(activeTask.progress, 99));
        displayedProgressRef.current = next;
        return next;
      });
      return;
    }

    const scaled =
      PREP_MAX +
      ((UPLOAD_MAX - PREP_MAX) * Math.min(activeTask.progress, 100)) / 100;

    setDisplayedProgress((prev) => {
      const next = Math.max(prev, Math.min(scaled, UPLOAD_MAX));
      displayedProgressRef.current = next;
      return next;
    });
  }, [activeTask?.progress, activeTask?.status, activeTask, isComposite]);

  // 성공 단계 처리 (순차 상승: 낮은 퍼센트 → 중간 스테이지 → 최종 100%)
  // 빠르게 success 가 도착(업로드 이벤트가 1~2회만 발생)해도 90% 또는 100%로 점프하지 않고
  // 단계별(예: 15%→35%→55%→70%→85%→90%→100%)로 자연스럽게 상승
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status !== "success") return;

    let cancelled = false;
    let current = displayedProgressRef.current;

    // 너무 낮으면 최소 시작점 보정 (0~5% 구간 보이기 위함)
    if (current < 5) {
      current = 5;
      setDisplayedProgress(current);
      displayedProgressRef.current = current;
    }

    // 이미 90 이상이면 바로 최종 애니메이션만
    if (current >= FINAL_MIN) {
      runFinalTo100();
      return;
    }

    // 현재 진행도에 따라 중간 스테이지 배열 생성 (유연 확장 가능)
    const stages: number[] = [];
    // 목표 중간 스테이지들 (중간 값들은 필요 시 튜닝 가능)
    const candidateStages = [15, 35, 55, 70, 85, 90];
    for (const s of candidateStages) {
      if (s > current && s < FINAL_MIN) {
        stages.push(s);
      }
    }
    // FINAL_MIN(90)은 runFinalTo100 직전에 도달하도록 마지막에 포함
    if (stages[stages.length - 1] !== FINAL_MIN && FINAL_MIN > current) {
      stages.push(FINAL_MIN);
    }

    const PER_STAGE_DURATION = 180; // 각 스테이지 전환 시간 (ms)
    let stageIndex = 0;

    function animateStage(target: number, cb: () => void) {
      const startVal = displayedProgressRef.current;
      const startTime = Date.now();
      const duration = PER_STAGE_DURATION;

      const step = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        // easeOutQuad
        const eased = 1 - (1 - ratio) * (1 - ratio);
        const value = startVal + (target - startVal) * eased;
        setDisplayedProgress(value);
        displayedProgressRef.current = value;
        if (ratio < 1) {
          requestAnimationFrame(step);
        } else {
          cb();
        }
      };
      requestAnimationFrame(step);
    }

    function runStages() {
      if (cancelled) return;
      if (stageIndex >= stages.length) {
        runFinalTo100();
        return;
      }
      const nextTarget = stages[stageIndex++];
      animateStage(nextTarget, runStages);
    }

    function runFinalTo100() {
      if (cancelled) return;
      const start = Math.max(displayedProgressRef.current, FINAL_MIN);
      const startTime = Date.now();
      const duration = FINAL_DURATION_MS;
      const step = () => {
        if (cancelled) return;
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        const value = start + (100 - start) * ratio;
        setDisplayedProgress(value);
        displayedProgressRef.current = value;
        if (ratio < 1) {
          requestAnimationFrame(step);
        } else {
          setTimeout(() => {
            if (!cancelled) removeUploadTask(activeTask.id);
          }, successAutoHideMs);
        }
      };
      requestAnimationFrame(step);
    }

    runStages();

    return () => {
      cancelled = true;
    };
  }, [activeTask, successAutoHideMs]);

  // 에러 상태: 일정 시간 후 자동 제거
  useEffect(() => {
    if (!activeTask) return;
    if (activeTask.status !== "error") return;
    const timer = setTimeout(() => {
      removeUploadTask(activeTask.id);
    }, errorAutoHideMs);
    return () => clearTimeout(timer);
  }, [activeTask, errorAutoHideMs]);

  // 화면 표시 여부
  const visible = !!activeTask && (visibleOverride ?? true);
  // 페이드 애니메이션
  const opacityAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  if (!visible || !activeTask) return null;

  const isPending = activeTask.status === "pending";
  const isUploading = activeTask.status === "uploading";
  const isSuccess = activeTask.status === "success";
  const isError = activeTask.status === "error";

  // 바 색상
  const barColor = isError ? "#ff4d4f" : isSuccess ? "#00C853" : "#4185F4";

  // 메시지 (하이브리드 단계별)
  let phaseMessage: string;
  if (isPending) phaseMessage = "준비 중...";
  // else if (isUploading) phaseMessage = activeTask.message || "업로드 중...";
  else if (isUploading) phaseMessage = "업로드 중...";
  else if (isSuccess) phaseMessage = "최종 등록 중...";
  else if (isError) phaseMessage = activeTask.errorMessage || "업로드 실패";
  else phaseMessage = activeTask.message || "처리 중...";

  const shownPercent = isError
    ? Math.round(displayedProgressRef.current) // 실패 시 현재 표시 유지
    : Math.round(displayedProgress);

  const containerPositionStyle =
    position === "top" ? styles.positionTop : styles.positionBottom;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        containerPositionStyle,
        { opacity: opacityAnim },
        Platform.select({
          web: { backdropFilter: "blur(6px)" } as any,
          default: {},
        }),
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner} pointerEvents="auto">
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {activeTask.title || "업로드 작업"}
          </Text>
          <View style={styles.rightArea}>
            {!isSuccess && !isError && (
              <Text style={styles.percentText}>{shownPercent}%</Text>
            )}
            {isSuccess && (
              <Text style={styles.successText}>{shownPercent}%</Text>
            )}
            {isError && <Text style={styles.errorText}>실패</Text>}
            {isError && onRetry && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => onRetry(activeTask)}
              >
                <Text style={styles.retryText}>재시도</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => removeUploadTask(activeTask.id)}
            >
              <Text style={styles.closeText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[styles.message, isError ? styles.messageError : undefined]}
          numberOfLines={1}
        >
          {phaseMessage}
        </Text>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(shownPercent, 100)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingHorizontal: 12,
  },
  positionTop: {
    top: Platform.select({ ios: 54, android: 20, default: 8 }),
  },
  positionBottom: {
    bottom: Platform.select({ ios: 32, android: 24, default: 16 }),
  },
  inner: {
    backgroundColor: "rgba(32,32,36,0.9)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    paddingRight: 8,
  },
  rightArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  percentText: {
    color: "#fff",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  successText: {
    color: "#00C853",
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    color: "#ff4d4f",
    fontSize: 12,
    fontWeight: "600",
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginLeft: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  closeButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 2,
  },
  closeText: {
    color: "#bbb",
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "600",
  },
  message: {
    marginTop: 4,
    color: "#d8d8d8",
    fontSize: 11,
  },
  messageError: {
    color: "#ffb3b3",
  },
  progressBarBackground: {
    marginTop: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 4,
  },
});

export default UploadTaskBar;
