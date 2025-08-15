import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// LinearGradient 대신 기본 View 컴포넌트 사용
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useMutation, useQuery } from "@apollo/client";
import { ENTER_LOTTERY, GET_LOTTERY_STATUS } from "@/lib/graphql/lottery";

interface LotteryData {
  hasActiveLottery: boolean;
  lottery?: {
    id: string;
    roundNumber: number;
    totalPrize: number;
    winnerCount: number;
    prizePerWinner: number;
    endTime: string;
  };
  hasEntered: boolean;
  remainingSeconds: number;
  totalEntries: number;
}

interface PointLotteryProps {
  onPointsUpdated?: () => void;
}

/**
 * 포인트 추첨 컴포넌트
 *
 * 60분마다 진행되는 포인트 추첨 시스템의 메인 UI입니다.
 * 실시간 카운트다운, 응모, 결과 표시 등의 기능을 제공합니다.
 */
export default function PointLottery({ onPointsUpdated }: PointLotteryProps) {
  const { themed, theme } = useAppTheme();
  const [timeLeft, setTimeLeft] = useState(0);
  const [isEntering, setIsEntering] = useState(false);

  // 애니메이션 값들
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // GraphQL 쿼리 및 뮤테이션
  const { data, loading, error, refetch } = useQuery<{
    currentLotteryStatus: LotteryData;
  }>(GET_LOTTERY_STATUS, {
    pollInterval: 5000, // 5초마다 폴링
    fetchPolicy: "cache-and-network",
  });

  const [enterLottery] = useMutation(ENTER_LOTTERY, {
    onCompleted: () => {
      Alert.alert(
        "응모 완료! 🎉",
        "포인트 추첨에 성공적으로 응모했습니다!\n결과는 추첨 종료 후 확인할 수 있습니다.",
        [{ text: "확인", style: "default" }]
      );
      refetch();
    },
    onError: (error) => {
      Alert.alert(
        "응모 실패",
        error.message || "응모 중 오류가 발생했습니다.",
        [{ text: "확인", style: "default" }]
      );
    },
  });

  const lotteryData = data?.currentLotteryStatus;

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
      ])
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
      })
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
      ])
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
    if (
      !lotteryData?.hasActiveLottery ||
      lotteryData.hasEntered ||
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

  // 로딩 상태
  if (loading) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>추첨 정보 로딩 중...</Text>
        </View>
      </View>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <View style={themed($container)}>
        <View style={themed($errorContainer)}>
          <Text style={themed($errorText)}>추첨 정보를 불러올 수 없습니다</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={themed($retryButton)}
          >
            <Text style={themed($retryButtonText)}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 활성 추첨이 없는 경우
  if (!lotteryData?.hasActiveLottery) {
    return (
      <View style={themed($container)}>
        <View style={themed($noLotteryContainer)}>
          <Text style={themed($noLotteryIcon)}>⏰</Text>
          <Text style={themed($noLotteryTitle)}>다음 추첨을 기다리는 중</Text>
          <Text style={themed($noLotteryText)}>
            매시 정각에 새로운 포인트 추첨이 시작됩니다
          </Text>
        </View>
      </View>
    );
  }

  const lottery = lotteryData.lottery!;
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={themed($container)}>
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
        <View style={themed($header)}>
          <View style={themed($headerLeft)}>
            <Text style={themed($roundNumber)}>#{lottery.roundNumber}회차</Text>
            <Text style={themed($title)}>포인트 추첨</Text>
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
            {lottery.totalPrize.toLocaleString()}P
          </Text>
          <Text style={themed($winnerInfo)}>
            {lottery.winnerCount}명이 각각{" "}
            {lottery.prizePerWinner.toLocaleString()}P 획득
          </Text>
        </View>

        {/* 카운트다운 */}
        <View style={themed($countdownSection)}>
          <Text style={themed($countdownLabel)}>남은 시간</Text>
          <View style={themed($countdownContainer)}>
            <Text style={themed($countdownTime)}>{formatTime(timeLeft)}</Text>
            <Text style={themed($countdownUnit)}>분:초</Text>
          </View>
        </View>

        {/* 응모 현황 */}
        <View style={themed($statsSection)}>
          <View style={themed($statItem)}>
            <Text style={themed($statValue)}>{lotteryData.totalEntries}</Text>
            <Text style={themed($statLabel)}>총 응모자</Text>
          </View>
          <View style={themed($statDivider)} />
          <View style={themed($statItem)}>
            <Text style={themed($statValue)}>
              {lotteryData.totalEntries > 0
                ? Math.round(
                    (lottery.winnerCount / lotteryData.totalEntries) * 100
                  )
                : 0}
              %
            </Text>
            <Text style={themed($statLabel)}>당첨 확률</Text>
          </View>
        </View>

        {/* 응모 버튼 */}
        <TouchableOpacity
          style={[
            themed($enterButton),
            (lotteryData.hasEntered || timeLeft <= 0 || isEntering) &&
              themed($enterButtonDisabled),
          ]}
          onPress={handleEnterLottery}
          disabled={lotteryData.hasEntered || timeLeft <= 0 || isEntering}
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
                  ? "추첨 종료"
                  : "무료 응모하기"}
          </Text>
        </TouchableOpacity>

        {/* 안내 메시지 */}
        <Text style={themed($infoText)}>
          {lotteryData.hasEntered
            ? "응모가 완료되었습니다. 행운을 빕니다! 🍀"
            : "60분에 1번만 응모할 수 있습니다"}
        </Text>
      </View>
    </View>
  );
}

// 스타일 정의
const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginHorizontal: spacing.md,
  marginVertical: spacing.sm,
});

const $gradientContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderRadius: 20,
  padding: spacing.lg,
  position: "relative",
  overflow: "hidden",
  backgroundColor: "#FF6B9D", // 메인 그라데이션 색상
  // 그라데이션 효과를 위한 그림자 추가
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

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $countdownContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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

const $loadingContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 20,
  padding: spacing.xl,
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $errorContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 20,
  padding: spacing.xl,
  alignItems: "center",
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.error,
  textAlign: "center",
  marginBottom: spacing.md,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 12,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "600",
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
