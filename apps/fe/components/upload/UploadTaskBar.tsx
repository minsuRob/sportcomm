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
 * UploadTaskBar
 *
 * 전역 업로드(게시글 작성, 이미지/비디오 업로드 등) 진행 상황을
 * 피드 화면 상단(또는 하단)에 고정된 진행 바(progress bar) 형태로 표시하는 컴포넌트.
 *
 * 변경 사항(간소화):
 *  - success / error 상태는 더 이상 activeTask 로 선택하지 않음
 *    → 완료/실패 즉시 진행 바 비표시 (무한 업데이트 루프 차단 목적)
 *
 * 사용 예:
 *   <UploadTaskBar position="top" />
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

const UploadTaskBar: React.FC<UploadTaskBarProps> = ({
  position = "top",
  onRetry,
  visibleOverride,
  pickTaskStrategy,
  successAutoHideMs = DEFAULT_SUCCESS_HIDE_MS,
  errorAutoHideMs = DEFAULT_ERROR_HIDE_MS,
}) => {
  const rawTasks = useActiveUploadTasks();
  /**
   * 메모이제이션 가드:
   * 동일한 내용(길이/각 항목 id, status, progress)이면 새로운 배열 참조라도
   * 렌더 트리를 다시 돌리지 않도록 stableTasks 로 고정
   */
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

  /**
   * 표시할 단일 활성 태스크 선정
   * - 오직 pending | uploading 상태만 표시 (success/error 제외)
   */
  const activeTask = useMemo<UploadTask | undefined>(() => {
    if (pickTaskStrategy) return pickTaskStrategy(tasks);
    if (tasks.length === 0) return undefined;
    return [...tasks]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .find((t) => t.status === "pending" || t.status === "uploading");
  }, [tasks, pickTaskStrategy]);

  // (success/error 상태를 제외했으므로 자동 제거 타이머는 사실상 동작하지 않음 - 보수적 유지)
  // success / error 상태는 activeTask 에 포함되지 않으므로 자동 제거 타이머 제거

  // 애니메이션 값
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const visible = !!activeTask && (visibleOverride ?? true);

  // 표시/숨김 애니메이션
  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, opacityAnim]);

  // 진행률 애니메이션
  useEffect(() => {
    if (!activeTask) return;
    Animated.timing(progressAnim, {
      toValue: activeTask.progress,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [activeTask, progressAnim]);

  if (!visible || !activeTask) return null;

  const isError = activeTask.status === "error";
  const isSuccess = activeTask.status === "success";
  const isUploading =
    activeTask.status === "pending" || activeTask.status === "uploading";

  const barColor = isError ? "#ff4d4f" : isSuccess ? "#00C853" : "#4185F4";

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

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
            {isUploading && (
              <Text style={styles.percentText}>
                {Math.round(activeTask.progress)}%
              </Text>
            )}
            {/* success/error 는 activeTask 에서 제외되므로 일반적으로 도달하지 않음 (안전상 남김) */}
            {isSuccess && <Text style={styles.successText}>완료</Text>}
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

        {(activeTask.message || activeTask.errorMessage) && (
          <Text
            style={[styles.message, isError ? styles.messageError : undefined]}
            numberOfLines={1}
          >
            {activeTask.errorMessage || activeTask.message}
          </Text>
        )}

        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

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
