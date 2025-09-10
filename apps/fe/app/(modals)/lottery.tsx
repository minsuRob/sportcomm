import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useMutation, useQuery } from "@apollo/client";
import {
  ENTER_LOTTERY,
  GET_LOTTERY_STATUS,
  GET_LOTTERY_HISTORY,
  GET_LOTTERY_WINNERS,
} from "@/lib/graphql/lottery";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { showToast } from "@/components/CustomToast";
import AppDialog from "@/components/ui/AppDialog";

interface LotteryData {
  hasActiveLottery: boolean;
  lottery?: {
    id: string;
    roundNumber: number;
    totalPrize: number;
    winnerCount: number;
    prizePerWinner: number;
    endTime: string;
    announceTime: string;
    finalEndTime: string;
    status: string;
    winnerIds?: string[];
  };
  hasEntered: boolean;
  remainingSeconds: number;
  totalEntries: number;
  currentPhase: "entry" | "announce" | "completed";
}

/**
 * 포인트 추첨 응모 페이지
 *
 * 사용자가 능동적으로 추첨에 응모할 수 있는 전용 페이지입니다.
 * 현재 추첨 정보, 응모 기능, 추첨 이력을 제공합니다.
 */
export default function LotteryScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const { currentUser, reload: reloadCurrentUser } = useCurrentUser();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEntering, setIsEntering] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 다이얼로그 상태
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // 애니메이션 값들
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<{
    currentLotteryStatus: LotteryData;
  }>(GET_LOTTERY_STATUS, {
    pollInterval: 60000, // 60초마다 폴링
    fetchPolicy: "cache-and-network",
  });

  const { data: historyData, refetch: refetchHistory } = useQuery(
    GET_LOTTERY_HISTORY,
    {
      variables: { page: 1, limit: 5 },
      fetchPolicy: "cache-and-network",
    },
  );

  const [enterLottery] = useMutation(ENTER_LOTTERY, {
    onCompleted: async () => {
      setDialogMessage("포인트 추첨에 성공적으로 응모했습니다!\n결과는 추첨 종료 후 확인할 수 있습니다.");
      setShowSuccessDialog(true);
      await refetch();
      await reloadCurrentUser(); // 포인트 업데이트
      showToast({
        type: "success",
        title: "응모 완료",
        message: "포인트 추첨에 성공적으로 응모했습니다!",
        duration: 3000,
      });
    },
    onError: (error) => {
      setDialogMessage(error.message || "응모 중 오류가 발생했습니다.");
      setShowErrorDialog(true);
    },
  });

  const lotteryData = data?.currentLotteryStatus;

  // 당첨자 조회 (결과 발표 기간에만)
  const { data: winnersData, refetch: refetchWinners } = useQuery(
    GET_LOTTERY_WINNERS,
    {
      variables: { lotteryId: lotteryData?.lottery?.id || "" },
      skip:
        !lotteryData?.lottery?.id || lotteryData?.currentPhase !== "announce",
      fetchPolicy: "cache-and-network",
    },
  );

  /**
   * 발표(announce) 단계에서 당첨자 목록에 현재 사용자가 포함된 경우
   * - 사용자 포인트/경험치 등이 즉시 반영되도록 사용자 정보를 강제 새로고침
   * - 이미 다른 경로(폴링/수동 새로고침)로 반영될 수도 있으나 즉시 UX 향상 목적
   */
  useEffect(() => {
    if (
      lotteryData?.currentPhase === "announce" &&
      winnersData?.lotteryWinners &&
      winnersData.lotteryWinners.length > 0 &&
      currentUser
    ) {
      const isWinner = winnersData.lotteryWinners.some(
        (w: any) => w.user?.id === currentUser.id,
      );
      if (isWinner) {
        // 강제 동기화 (true 플래그는 내부 구현에서 즉시 원격 재조회 유도 용도라고 가정)
        reloadCurrentUser(true);
      }
    }
  }, [
    lotteryData?.currentPhase,
    winnersData?.lotteryWinners,
    currentUser?.id,
    reloadCurrentUser,
  ]);

  // 새로고침 처리
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const promises = [refetch(), refetchHistory()];
      if (lotteryData?.currentPhase === "announce") {
        promises.push(refetchWinners());
      }
      await Promise.all(promises);
    } finally {
      setRefreshing(false);
    }
  };

  // 카운트다운 타이머
  useEffect(() => {
    if (!lotteryData?.hasActiveLottery) return;

    setTimeLeft(lotteryData.remainingSeconds);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          refetch(); // 추첨 종료 시 데이터 새로고침
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lotteryData?.remainingSeconds, refetch]);

  // 펄스 애니메이션
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  // 회전 애니메이션
  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    rotate.start();

    return () => rotate.stop();
  }, []);

  // 반짝임 애니메이션
  useEffect(() => {
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    sparkle.start();

    return () => sparkle.stop();
  }, []);

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 응모 처리
  const handleEnterLottery = async () => {
    if (!currentUser) {
      setDialogMessage("추첨에 응모하려면 로그인이 필요합니다.");
      setShowErrorDialog(true);
      return;
    }

    if (
      !lotteryData?.hasActiveLottery ||
      lotteryData.hasEntered ||
      lotteryData.currentPhase !== "entry" ||
      isEntering
    ) {
      return;
    }

    setIsEntering(true);
    try {
      await enterLottery();
    } finally {
      setIsEntering(false);
    }
  };

  // 현재 단계에 따른 상태 텍스트
  const getPhaseText = () => {
    if (!lotteryData?.currentPhase) return "";

    switch (lotteryData.currentPhase) {
      case "entry":
        return "응모 기간";
      case "announce":
        return "결과 발표";
      case "completed":
        return "추첨 종료";
      default:
        return "";
    }
  };

  // 현재 단계에 따른 카운트다운 라벨
  const getCountdownLabel = () => {
    if (!lotteryData?.currentPhase) return "남은 시간";

    switch (lotteryData.currentPhase) {
      case "entry":
        return "응모 마감까지";
      case "announce":
        return "발표 종료까지";
      default:
        return "남은 시간";
    }
  };

  // 뒤로가기 처리
  const handleGoBack = () => {
    router.back();
  };

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity onPress={handleGoBack} style={themed($backButton)}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>포인트 추첨</Text>
        <View style={themed($headerRight)} />
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 현재 추첨 섹션 */}
        {loading ? (
          <View style={themed($noLotterySection)}>
            <View style={themed($noLotteryContainer)}>
              <Text style={themed($loadingText)}>
                추첨 정보를 불러오는 중...
              </Text>
            </View>
          </View>
        ) : lotteryData?.hasActiveLottery && lotteryData?.lottery ? (
          <View style={themed($currentLotterySection)}>
            <View style={themed($gradientContainer)}>
              {/* 반짝임 효과 */}
              <Animated.View
                style={[
                  themed($sparkleOverlay),
                  {
                    opacity: sparkleAnim,
                  },
                ]}
              />

              {/* 헤더 */}
              <View style={themed($lotteryHeader)}>
                <View style={themed($headerLeft)}>
                  <Text style={themed($roundNumber)}>
                    #{lotteryData.lottery!.roundNumber}회차
                  </Text>
                  <Text style={themed($title)}>{getPhaseText()}</Text>
                </View>
                <Animated.View
                  style={[
                    themed($iconContainer),
                    {
                      transform: [
                        { scale: pulseAnim },
                        { rotate: rotateInterpolate },
                      ],
                    },
                  ]}
                >
                  <Text style={themed($mainIcon)}>🎰</Text>
                </Animated.View>
              </View>

              {/* 상금 정보 */}
              <View style={themed($prizeSection)}>
                <Text style={themed($prizeLabel)}>총 상금</Text>
                <Text style={themed($prizeAmount)}>
                  {lotteryData.lottery!.totalPrize.toLocaleString()}P
                </Text>
                <Text style={themed($winnerInfo)}>
                  {lotteryData.lottery!.winnerCount}명이 각각{" "}
                  {lotteryData.lottery!.prizePerWinner.toLocaleString()}P 획득
                </Text>
              </View>

              {/* 카운트다운 */}
              <View style={themed($countdownSection)}>
                <Text style={themed($countdownLabel)}>
                  {getCountdownLabel()}
                </Text>
                <View style={themed($countdownContainer)}>
                  <Text style={themed($countdownTime)}>
                    {formatTime(timeLeft)}
                  </Text>
                  <Text style={themed($countdownUnit)}>분:초</Text>
                </View>
              </View>

              {/* 응모 현황 */}
              <View style={themed($statsSection)}>
                <View style={themed($statItem)}>
                  <Text style={themed($statValue)}>
                    {lotteryData.totalEntries}
                  </Text>
                  <Text style={themed($statLabel)}>총 응모자</Text>
                </View>
                <View style={themed($statDivider)} />
                <View style={themed($statItem)}>
                  <Text style={themed($statValue)}>
                    {lotteryData.totalEntries > 0
                      ? Math.round(
                          (lotteryData.lottery!.winnerCount /
                            lotteryData.totalEntries) *
                            100,
                        )
                      : 0}
                    %
                  </Text>
                  <Text style={themed($statLabel)}>당첨 확률</Text>
                </View>
              </View>

              {/* 응모 버튼 또는 당첨자 발표 */}
              {lotteryData.currentPhase === "entry" ? (
                <>
                  <TouchableOpacity
                    style={[
                      themed($enterButton),
                      (lotteryData.hasEntered || timeLeft <= 0 || isEntering) &&
                        themed($enterButtonDisabled),
                    ]}
                    onPress={handleEnterLottery}
                    disabled={
                      lotteryData.hasEntered || timeLeft <= 0 || isEntering
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        lotteryData.hasEntered
                          ? "checkmark-circle"
                          : timeLeft <= 0
                            ? "time-outline"
                            : "ticket-outline"
                      }
                      size={24}
                      color="white"
                    />
                    <Text style={themed($enterButtonText)}>
                      {isEntering
                        ? "응모 중..."
                        : lotteryData.hasEntered
                          ? "응모 완료"
                          : timeLeft <= 0
                            ? "응모 마감"
                            : "무료 응모하기"}
                    </Text>
                  </TouchableOpacity>

                  {/* 안내 메시지 */}
                  <Text style={themed($infoText)}>
                    {lotteryData.hasEntered
                      ? "응모가 완료되었습니다. 행운을 빕니다! 🍀"
                      : "정각부터 50분까지 응모 가능합니다"}
                  </Text>
                </>
              ) : lotteryData.currentPhase === "announce" ? (
                <>
                  {/* 당첨자 발표 */}
                  <View style={themed($winnersSection)}>
                    <Text style={themed($winnersTitle)}>🎉 당첨자 발표 🎉</Text>
                    {winnersData?.lotteryWinners &&
                    winnersData.lotteryWinners.length > 0 ? (
                      <View style={themed($winnersList)}>
                        {winnersData.lotteryWinners.map(
                          (winner: any, index: number) => (
                            <View key={winner.id} style={themed($winnerItem)}>
                              <Text style={themed($winnerRank)}>
                                #{index + 1}
                              </Text>
                              <Text style={themed($winnerName)}>
                                {winner.user.nickname}
                              </Text>
                              <Text style={themed($winnerPrize)}>
                                +{winner.prizePoints?.toLocaleString()}P
                              </Text>
                            </View>
                          ),
                        )}
                      </View>
                    ) : (
                      <Text style={themed($noWinnersText)}>
                        당첨자가 없습니다
                      </Text>
                    )}
                  </View>

                  {/* 안내 메시지 */}
                  <Text style={themed($infoText)}>
                    🎊 당첨자 발표 중! 다음 응모는 {formatTime(timeLeft)} 후
                    시작됩니다
                  </Text>
                </>
              ) : (
                <Text style={themed($infoText)}>추첨이 종료되었습니다</Text>
              )}
            </View>
          </View>
        ) : (
          <View style={themed($noLotterySection)}>
            <View style={themed($noLotteryContainer)}>
              <Text style={themed($noLotteryIcon)}>🎰</Text>
              <Text style={themed($noLotteryTitle)}>포인트 추첨 시스템</Text>
              <View style={themed($systemInfoContainer)}>
                <View style={themed($systemInfoItem)}>
                  <Text style={themed($systemInfoIcon)}>🎯</Text>
                  <Text style={themed($systemInfoText)}>
                    정각부터 50분까지는 언제든 응모 가능
                  </Text>
                </View>
                <View style={themed($systemInfoItem)}>
                  <Text style={themed($systemInfoIcon)}>🎊</Text>
                  <Text style={themed($systemInfoText)}>
                    50분부터 10분간은 당첨자 발표를 실시간으로 확인 가능
                  </Text>
                </View>
                <View style={themed($systemInfoItem)}>
                  <Text style={themed($systemInfoIcon)}>🔄</Text>
                  <Text style={themed($systemInfoText)}>
                    60분이 되면 자동으로 새로운 추첨이 시작되어 지속적인 참여
                    가능
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={themed($tempEnterButton)}
                onPress={handleEnterLottery}
                disabled={!currentUser || isEntering}
                activeOpacity={0.8}
              >
                <Text style={themed($tempEnterButtonText)}>
                  {!currentUser
                    ? "로그인 후 참여 가능"
                    : isEntering
                      ? "응모 중..."
                      : "추첨 참여하기"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 최근 추첨 이력 */}
        {historyData?.lotteryHistory?.lotteries && (
          <View style={themed($historySection)}>
            <Text style={themed($sectionTitle)}>최근 추첨 이력</Text>
            {historyData.lotteryHistory.lotteries.map((lottery: any) => (
              <View key={lottery.id} style={themed($historyItem)}>
                <View style={themed($historyHeader)}>
                  <Text style={themed($historyRound)}>
                    #{lottery.roundNumber}회차
                  </Text>
                  <Text style={themed($historyDate)}>
                    {new Date(lottery.endTime).toLocaleDateString()}
                  </Text>
                </View>
                <View style={themed($historyDetails)}>
                  <Text style={themed($historyPrize)}>
                    총 상금: {lottery.totalPrize.toLocaleString()}P
                  </Text>
                  <Text style={themed($historyEntries)}>
                    응모자: {lottery.totalEntries}명
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 성공 다이얼로그 */}
      <AppDialog
        visible={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="응모 완료! 🎉"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowSuccessDialog(false)}
      />

      {/* 에러 다이얼로그 */}
      <AppDialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title="알림"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowErrorDialog(false)}
      />
    </View>
  );
}

// 스타일 정의
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
  marginLeft: -spacing.sm,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $headerRight: ThemedStyle<ViewStyle> = () => ({
  width: 40,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $currentLotterySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $noLotterySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $gradientContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderRadius: 20,
  padding: spacing.lg,
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#FF6B9D",
  shadowColor: "#C44569",
  shadowOffset: {
    width: 0,
    height: 8,
  },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 12,
});

const $sparkleOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255, 255, 255, 0.1)",
});

const $lotteryHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.lg,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $roundNumber: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
  color: "rgba(255, 255, 255, 0.8)",
  marginBottom: 4,
});

const $title: ThemedStyle<TextStyle> = () => ({
  fontSize: 24,
  fontWeight: "800",
  color: "white",
});

const $iconContainer: ThemedStyle<ViewStyle> = () => ({
  width: 60,
  height: 60,
  justifyContent: "center",
  alignItems: "center",
});

const $mainIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 40,
});

const $prizeSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.lg,
});

const $prizeLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "rgba(255, 255, 255, 0.9)",
  marginBottom: 8,
});

const $prizeAmount: ThemedStyle<TextStyle> = () => ({
  fontSize: 36,
  fontWeight: "900",
  color: "white",
  textShadowColor: "rgba(0, 0, 0, 0.3)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
});

const $winnerInfo: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 14,
  color: "rgba(255, 255, 255, 0.8)",
  marginTop: spacing.xs,
  textAlign: "center",
});

const $countdownSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.lg,
});

const $countdownLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "rgba(255, 255, 255, 0.9)",
  marginBottom: 8,
});

const $countdownContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  borderRadius: 16,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  alignItems: "center",
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.3)",
});

const $countdownTime: ThemedStyle<TextStyle> = () => ({
  fontSize: 32,
  fontWeight: "900",
  color: "white",
  fontFamily: "monospace",
});

const $countdownUnit: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "rgba(255, 255, 255, 0.8)",
  marginTop: 4,
});

const $statsSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-around",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: 12,
  paddingVertical: spacing.md,
  marginBottom: spacing.lg,
});

const $statItem: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  flex: 1,
});

const $statValue: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
  fontWeight: "800",
  color: "white",
});

const $statLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "rgba(255, 255, 255, 0.8)",
  marginTop: 4,
});

const $statDivider: ThemedStyle<ViewStyle> = () => ({
  width: 1,
  height: 40,
  backgroundColor: "rgba(255, 255, 255, 0.3)",
});

const $enterButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255, 255, 255, 0.25)",
  borderRadius: 16,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  borderWidth: 2,
  borderColor: "rgba(255, 255, 255, 0.4)",
  gap: spacing.sm,
  marginBottom: spacing.sm,
});

const $enterButtonDisabled: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  borderColor: "rgba(255, 255, 255, 0.2)",
});

const $enterButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  fontWeight: "700",
  color: "white",
});

const $infoText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  color: "rgba(255, 255, 255, 0.8)",
  textAlign: "center",
  fontStyle: "italic",
});

const $noLotteryContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 20,
  padding: spacing.xl,
  alignItems: "center",
});

const $noLotteryIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 48,
  marginBottom: spacing.md,
});

const $noLotteryTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $noLotteryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
});

const $historySection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
  marginBottom: spacing.md,
});

const $historyItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.sm,
  borderWidth: 1,
  borderColor: colors.border,
});

const $historyHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xs,
});

const $historyRound: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
});

const $historyDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $historyDetails: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
});

const $historyPrize: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.tint,
  fontWeight: "600",
});

const $historyEntries: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $winnersSection: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $winnersTitle: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 18,
  fontWeight: "800",
  color: "white",
  marginBottom: spacing.md,
  textAlign: "center",
});

const $winnersList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: "100%",
  gap: spacing.xs,
});

const $winnerItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "rgba(255, 255, 255, 0.15)",
  borderRadius: 12,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  justifyContent: "space-between",
});

const $winnerRank: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "800",
  color: "#FFD700",
  width: 30,
});

const $winnerName: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "700",
  color: "white",
  flex: 1,
  textAlign: "center",
});

const $winnerPrize: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "800",
  color: "#FFD700",
});

const $noWinnersText: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  color: "rgba(255, 255, 255, 0.8)",
  textAlign: "center",
  marginTop: spacing.md,
});

const $systemInfoContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginVertical: spacing.lg,
  gap: spacing.md,
});

const $systemInfoItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  gap: spacing.sm,
});

const $systemInfoIcon: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  width: 24,
});

const $systemInfoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
  flex: 1,
  lineHeight: 20,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.lg,
  fontStyle: "italic",
});

const $tempEnterButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  borderRadius: 16,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.lg,
  marginTop: spacing.lg,
  alignItems: "center",
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  opacity: 1,
});

const $tempEnterButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 18,
  fontWeight: "700",
  color: "white",
});
