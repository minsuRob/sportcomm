import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";
import AppDialog from "@/components/ui/AppDialog";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_LOTTERY_STATUS,
  GET_ADMIN_LOTTERY_STATS,
  ADMIN_STOP_CURRENT_LOTTERY,
  ADMIN_CREATE_CUSTOM_LOTTERY,
  type AdminLotteryStatsData,
} from "@/lib/graphql/lottery";
import { TagSearchTest } from "./test/TagSearchTest";
import { TagNavigationTest } from "./test/TagNavigationTest";

// 대시보드 통계 타입
interface DashboardStats {
  totalUsers: number;
  totalPosts: number;
  totalChatRooms: number;
  totalReports: number;
  activeUsers: number;
  recentPosts: number;
  pendingReports: number;
}

/**
 * 관리자 대시보드 화면
 *
 * 전체적인 서비스 현황과 주요 지표를 보여주는 관리자 메인 화면입니다.
 */
export default function AdminDashboardScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 대시보드 데이터 로드
  const loadDashboardData = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      // TODO: GraphQL 쿼리로 실제 데이터 로드
      // 현재는 목업 데이터 사용
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 로딩 시뮬레이션

      const mockStats: DashboardStats = {
        totalUsers: 1250,
        totalPosts: 3420,
        totalChatRooms: 45,
        totalReports: 23,
        activeUsers: 180,
        recentPosts: 67,
        pendingReports: 8,
      };

      setStats(mockStats);
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
      showToast({
        type: "error",
        title: "데이터 로드 실패",
        message: "대시보드 데이터를 불러오는 중 오류가 발생했습니다.",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // 새로고침 핸들러
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // 통계 카드 데이터
  const getStatCards = () => {
    if (!stats) return [];

    return [
      {
        title: "총 사용자",
        value: stats.totalUsers.toLocaleString(),
        icon: "people-outline",
        color: theme.colors.tint,
        onPress: () => router.push("/(admin)/users" as any),
      },
      {
        title: "총 게시물",
        value: stats.totalPosts.toLocaleString(),
        icon: "document-text-outline",
        color: "#10B981",
        onPress: () => router.push("/(admin)/posts" as any),
      },
      {
        title: "채팅방",
        value: stats.totalChatRooms.toLocaleString(),
        icon: "chatbubbles-outline",
        color: "#8B5CF6",
        onPress: () => router.push("/(admin)/chat-rooms" as any),
      },
      {
        title: "신고",
        value: stats.totalReports.toLocaleString(),
        icon: "flag-outline",
        color: "#EF4444",
        onPress: () => router.push("/(admin)/reports" as any),
      },
    ];
  };

  // 활동 지표 데이터
  const getActivityCards = () => {
    if (!stats) return [];

    return [
      {
        title: "활성 사용자 (24h)",
        value: stats.activeUsers.toLocaleString(),
        icon: "pulse-outline",
        color: "#06B6D4",
      },
      {
        title: "최근 게시물 (24h)",
        value: stats.recentPosts.toLocaleString(),
        icon: "trending-up-outline",
        color: "#10B981",
      },
      {
        title: "대기 중인 신고",
        value: stats.pendingReports.toLocaleString(),
        icon: "alert-circle-outline",
        color: "#F59E0B",
      },
    ];
  };

  // 관리 메뉴 데이터
  const getManagementMenus = () => [
    {
      title: "사용자 관리",
      description: "사용자 계정 및 권한 관리",
      icon: "people-outline",
      color: theme.colors.tint,
      onPress: () => router.push("/(admin)/users" as any),
    },
    {
      title: "채팅방 관리",
      description: "채팅방 생성, 삭제 및 설정",
      icon: "chatbubbles-outline",
      color: "#8B5CF6",
      onPress: () => router.push("/(admin)/chat-rooms" as any),
    },
    {
      title: "팀 관리",
      description: "스포츠 팀 추가, 수정 및 삭제",
      icon: "trophy-outline",
      color: "#F59E0B",
      onPress: () => router.push("/(admin)/teams" as any),
    },
    {
      title: "게시물 관리",
      description: "게시물 모니터링 및 관리",
      icon: "document-text-outline",
      color: "#10B981",
      onPress: () => router.push("/(admin)/posts" as any),
    },
    {
      title: "신고 관리",
      description: "사용자 신고 처리 및 관리",
      icon: "flag-outline",
      color: "#EF4444",
      onPress: () => router.push("/(admin)/reports" as any),
    },
    {
      title: "피드백 관리",
      description: "사용자 피드백 및 건의사항 처리",
      icon: "chatbubble-ellipses-outline",
      color: "#8B5CF6",
      onPress: () => router.push("/(admin)/feedbacks" as any),
    },
  ];

  if (isLoading) {
    return (
      <View style={themed($container)}>
        <View style={themed($loadingContainer)}>
          <Text style={themed($loadingText)}>대시보드 로딩 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <Text style={themed($headerTitle)}>관리자 대시보드</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons
            name="refresh-outline"
            color={theme.colors.text}
            size={24}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={themed($scrollContainer)}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 주요 통계 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>주요 통계</Text>
          <View style={themed($statsGrid)}>
            {getStatCards().map((card, index) => (
              <TouchableOpacity
                key={index}
                style={themed($statCard)}
                onPress={card.onPress}
              >
                <View
                  style={[
                    themed($statIconContainer),
                    { backgroundColor: card.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={card.icon as any}
                    color={card.color}
                    size={24}
                  />
                </View>
                <Text style={themed($statValue)}>{card.value}</Text>
                <Text style={themed($statTitle)}>{card.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 활동 지표 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>활동 지표</Text>
          <View style={themed($activityGrid)}>
            {getActivityCards().map((card, index) => (
              <View key={index} style={themed($activityCard)}>
                <View style={themed($activityHeader)}>
                  <Ionicons
                    name={card.icon as any}
                    color={card.color}
                    size={20}
                  />
                  <Text style={themed($activityTitle)}>{card.title}</Text>
                </View>
                <Text style={[themed($activityValue), { color: card.color }]}>
                  {card.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 추첨 관리 섹션 */}
        <LotteryManagementSection />

        {/* 테스트 관리 섹션 */}
        <TestManagementSection />

        {/* 관리 메뉴 */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>관리 메뉴</Text>
          <View style={themed($menuGrid)}>
            {getManagementMenus().map((menu, index) => (
              <TouchableOpacity
                key={index}
                style={themed($menuCard)}
                onPress={menu.onPress}
              >
                <View
                  style={[
                    themed($menuIconContainer),
                    { backgroundColor: menu.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={menu.icon as any}
                    color={menu.color}
                    size={28}
                  />
                </View>
                <View style={themed($menuContent)}>
                  <Text style={themed($menuTitle)}>{menu.title}</Text>
                  <Text style={themed($menuDescription)}>
                    {menu.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward-outline"
                  color={theme.colors.textDim}
                  size={20}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
});

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.md,
});

const $statsGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.sm,
});

const $statCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  minWidth: "45%",
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.border,
});

const $statIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $statValue: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 24,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $statTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  textAlign: "center",
});

const $activityGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
});

const $activityCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $activityHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $activityTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginLeft: spacing.sm,
});

const $activityValue: ThemedStyle<TextStyle> = () => ({
  fontSize: 20,
  fontWeight: "bold",
});

const $menuGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
});

const $menuCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $menuIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 56,
  height: 56,
  borderRadius: 28,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
});

const $menuContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $menuTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $menuDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

// === 추첨 관리 컴포넌트 ===

/**
 * 추첨 관리 섹션 컴포넌트
 */
function LotteryManagementSection() {
  const { themed, theme } = useAppTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [totalPrize, setTotalPrize] = useState("1000");
  const [winnerCount, setWinnerCount] = useState("5");
  const [durationMinutes, setDurationMinutes] = useState("50");
  // 다이얼로그 상태
  const [showStopLotteryDialog, setShowStopLotteryDialog] =
    useState<boolean>(false);
  const [showErrorDialog, setShowErrorDialog] = useState<boolean>(false);
  const [dialogMessage, setDialogMessage] = useState<string>("");

  // GraphQL 쿼리 및 뮤테이션
  const { data: lotteryData, refetch: refetchLottery } = useQuery(
    GET_LOTTERY_STATUS,
    {
      pollInterval: 30000, // 30초마다 폴링
    },
  );

  const { data: statsData, refetch: refetchStats } = useQuery<{
    adminLotteryStats: AdminLotteryStatsData;
  }>(GET_ADMIN_LOTTERY_STATS, {
    pollInterval: 60000, // 60초마다 폴링
  });

  const [stopLottery, { loading: stopping }] = useMutation(
    ADMIN_STOP_CURRENT_LOTTERY,
    {
      onCompleted: () => {
        showToast({
          type: "success",
          title: "추첨 중단 완료",
          message: "진행 중인 추첨이 성공적으로 중단되었습니다.",
          duration: 3000,
        });
        refetchLottery();
        refetchStats();
      },
      onError: (error) => {
        showToast({
          type: "error",
          title: "추첨 중단 실패",
          message: error.message || "추첨 중단 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    },
  );

  const [createLottery, { loading: creating }] = useMutation(
    ADMIN_CREATE_CUSTOM_LOTTERY,
    {
      onCompleted: () => {
        showToast({
          type: "success",
          title: "추첨 생성 완료",
          message: "새로운 이벤트 추첨이 성공적으로 생성되었습니다.",
          duration: 3000,
        });
        setShowCreateModal(false);
        refetchLottery();
        refetchStats();
        // 입력값 초기화
        setTotalPrize("1000");
        setWinnerCount("5");
        setDurationMinutes("50");
      },
      onError: (error) => {
        showToast({
          type: "error",
          title: "추첨 생성 실패",
          message: error.message || "추첨 생성 중 오류가 발생했습니다.",
          duration: 3000,
        });
      },
    },
  );

  // 추첨 중단 처리
  const handleStopLottery = (): void => {
    setShowStopLotteryDialog(true);
  };

  // 추첨 중단 확인
  const confirmStopLottery = () => {
    setShowStopLotteryDialog(false);
    stopLottery();
  };

  // 새 추첨 생성 처리
  const handleCreateLottery = () => {
    const prize = parseInt(totalPrize);
    const winners = parseInt(winnerCount);
    const duration = parseInt(durationMinutes);

    if (isNaN(prize) || prize < 100 || prize > 50000) {
      setDialogMessage("총 상금은 100P ~ 50,000P 사이여야 합니다.");
      setShowErrorDialog(true);
      return;
    }

    if (isNaN(winners) || winners < 1 || winners > 20) {
      setDialogMessage("당첨자 수는 1명 ~ 20명 사이여야 합니다.");
      setShowErrorDialog(true);
      return;
    }

    if (isNaN(duration) || duration < 10 || duration > 120) {
      setDialogMessage("응모 기간은 10분 ~ 120분 사이여야 합니다.");
      setShowErrorDialog(true);
      return;
    }

    // 추첨 생성은 바로 실행
    createLottery({
      variables: {
        totalPrize: prize,
        winnerCount: winners,
        durationMinutes: duration,
      },
    });
  };

  const currentLottery = lotteryData?.currentLotteryStatus?.lottery;
  const hasActiveLottery = lotteryData?.currentLotteryStatus?.hasActiveLottery;
  const stats = statsData?.adminLotteryStats;

  return (
    <>
      <View style={themed($section)}>
        <Text style={themed($sectionTitle)}>추첨 관리</Text>

        {/* 현재 추첨 상태 */}
        <View style={themed($lotteryStatusCard)}>
          <View style={themed($lotteryStatusHeader)}>
            <Text style={themed($lotteryStatusTitle)}>현재 추첨 상태</Text>
            <View
              style={[
                themed($statusBadge),
                {
                  backgroundColor: hasActiveLottery
                    ? theme.colors.tint + "20"
                    : theme.colors.textDim + "20",
                },
              ]}
            >
              <Text
                style={[
                  themed($statusBadgeText),
                  {
                    color: hasActiveLottery
                      ? theme.colors.tint
                      : theme.colors.textDim,
                  },
                ]}
              >
                {hasActiveLottery ? "진행 중" : "대기 중"}
              </Text>
            </View>
          </View>

          {hasActiveLottery && currentLottery ? (
            <View style={themed($lotteryInfo)}>
              <View style={themed($lotteryInfoRow)}>
                <Text style={themed($lotteryInfoLabel)}>회차:</Text>
                <Text style={themed($lotteryInfoValue)}>
                  #{currentLottery.roundNumber}회차
                </Text>
              </View>
              <View style={themed($lotteryInfoRow)}>
                <Text style={themed($lotteryInfoLabel)}>총 상금:</Text>
                <Text style={themed($lotteryInfoValue)}>
                  {currentLottery.totalPrize.toLocaleString()}P
                </Text>
              </View>
              <View style={themed($lotteryInfoRow)}>
                <Text style={themed($lotteryInfoLabel)}>당첨자:</Text>
                <Text style={themed($lotteryInfoValue)}>
                  {currentLottery.winnerCount}명
                </Text>
              </View>
              <View style={themed($lotteryInfoRow)}>
                <Text style={themed($lotteryInfoLabel)}>응모자:</Text>
                <Text style={themed($lotteryInfoValue)}>
                  {currentLottery.totalEntries}명
                </Text>
              </View>
            </View>
          ) : (
            <Text style={themed($noLotteryText)}>
              현재 진행 중인 추첨이 없습니다.
            </Text>
          )}
        </View>

        {/* 추첨 통계 */}
        {stats && (
          <View style={themed($statsCard)}>
            <Text style={themed($statsTitle)}>추첨 통계</Text>
            <View style={themed($statsGrid)}>
              <View style={themed($statItem)}>
                <Text style={themed($statValue)}>{stats.totalLotteries}</Text>
                <Text style={themed($statLabel)}>총 추첨</Text>
              </View>
              <View style={themed($statItem)}>
                <Text style={themed($statValue)}>{stats.activeLotteries}</Text>
                <Text style={themed($statLabel)}>진행 중</Text>
              </View>
              <View style={themed($statItem)}>
                <Text style={themed($statValue)}>{stats.totalEntries}</Text>
                <Text style={themed($statLabel)}>총 응모</Text>
              </View>
              <View style={themed($statItem)}>
                <Text style={themed($statValue)}>
                  {stats.totalPrizeDistributed.toLocaleString()}P
                </Text>
                <Text style={themed($statLabel)}>지급 상금</Text>
              </View>
            </View>
          </View>
        )}

        {/* 관리 버튼들 */}
        <View style={themed($actionButtons)}>
          <TouchableOpacity
            style={[
              themed($actionButton),
              themed($stopButton),
              (!hasActiveLottery || stopping) && themed($disabledButton),
            ]}
            onPress={handleStopLottery}
            disabled={!hasActiveLottery || stopping}
          >
            <Ionicons name="stop-circle-outline" size={20} color="white" />
            <Text style={themed($actionButtonText)}>
              {stopping ? "중단 중..." : "추첨 중단"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              themed($actionButton),
              themed($createButton),
              creating && themed($disabledButton),
            ]}
            onPress={() => setShowCreateModal(true)}
            disabled={creating}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={themed($actionButtonText)}>
              {creating ? "생성 중..." : "이벤트 추첨 생성"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 추첨 생성 모달 */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={themed($modalOverlay)}>
          <View style={themed($modalContent)}>
            <View style={themed($modalHeader)}>
              <Text style={themed($modalTitle)}>이벤트 추첨 생성</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={themed($modalCloseButton)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={themed($modalBody)}>
              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>총 상금 (P)</Text>
                <TextInput
                  style={themed($textInput)}
                  value={totalPrize}
                  onChangeText={setTotalPrize}
                  placeholder="1000"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textDim}
                />
                <Text style={themed($inputHint)}>100P ~ 50,000P</Text>
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>당첨자 수 (명)</Text>
                <TextInput
                  style={themed($textInput)}
                  value={winnerCount}
                  onChangeText={setWinnerCount}
                  placeholder="5"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textDim}
                />
                <Text style={themed($inputHint)}>1명 ~ 20명</Text>
              </View>

              <View style={themed($inputGroup)}>
                <Text style={themed($inputLabel)}>응모 기간 (분)</Text>
                <TextInput
                  style={themed($textInput)}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  placeholder="50"
                  keyboardType="numeric"
                  placeholderTextColor={theme.colors.textDim}
                />
                <Text style={themed($inputHint)}>10분 ~ 120분</Text>
              </View>

              {/* 미리보기 */}
              <View style={themed($previewCard)}>
                <Text style={themed($previewTitle)}>미리보기</Text>
                <Text style={themed($previewText)}>
                  총 상금: {parseInt(totalPrize) || 0}P
                </Text>
                <Text style={themed($previewText)}>
                  당첨자: {parseInt(winnerCount) || 0}명
                </Text>
                <Text style={themed($previewText)}>
                  개별 상금:{" "}
                  {Math.floor(
                    (parseInt(totalPrize) || 0) / (parseInt(winnerCount) || 1),
                  )}
                  P
                </Text>
                <Text style={themed($previewText)}>
                  응모 기간: {parseInt(durationMinutes) || 0}분
                </Text>
              </View>
            </View>

            <View style={themed($modalFooter)}>
              <TouchableOpacity
                style={[themed($modalButton), themed($cancelButton)]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={themed($cancelButtonText)}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  themed($modalButton),
                  themed($confirmButton),
                  creating && themed($disabledButton),
                ]}
                onPress={handleCreateLottery}
                disabled={creating}
              >
                <Text style={themed($confirmButtonText)}>
                  {creating ? "생성 중..." : "생성"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 추첨 중단 확인 다이얼로그 */}
      <AppDialog
        visible={showStopLotteryDialog}
        onClose={() => setShowStopLotteryDialog(false)}
        title="추첨 중단 확인"
        description="진행 중인 추첨을 중단하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
        confirmText="중단"
        cancelText="취소"
        onConfirm={confirmStopLottery}
      />

      {/* 에러 다이얼로그 */}
      <AppDialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title="입력 오류"
        description={dialogMessage}
        confirmText="확인"
        onConfirm={() => setShowErrorDialog(false)}
      />
    </>
  );
}

// === 추첨 관리 스타일 ===

const $lotteryStatusCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
});

const $lotteryStatusHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.sm,
});

const $lotteryStatusTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
});

const $statusBadgeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 12,
  fontWeight: "600",
});

const $lotteryInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.xs,
});

const $lotteryInfoRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
});

const $lotteryInfoLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $lotteryInfoValue: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $noLotteryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  fontStyle: "italic",
});

const $statsCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  padding: spacing.md,
  marginBottom: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
});

const $statsTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $actionButtons: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  gap: spacing.sm,
});

const $statItem: ThemedStyle<ViewStyle> = () => ({
  alignItems: "center",
  flex: 1,
});

const $statLabel: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 4,
});

const $actionButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.sm,
  borderRadius: 8,
  gap: spacing.xs,
});

const $stopButton: ThemedStyle<ViewStyle> = () => ({
  backgroundColor: "#EF4444",
});

const $createButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
});

const $disabledButton: ThemedStyle<ViewStyle> = () => ({
  opacity: 0.5,
});

const $actionButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 14,
  fontWeight: "600",
  color: "white",
});

// 모달 스타일
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.card,
  borderRadius: 16,
  width: "100%",
  maxWidth: 400,
  maxHeight: "80%",
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $modalCloseButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $modalBody: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.md,
});

const $inputGroup: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
});

const $inputLabel: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.background,
});

const $inputHint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: spacing.xs,
});

const $previewCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderRadius: 8,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
});

const $previewTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $previewText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginBottom: 2,
});

const $modalFooter: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  padding: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  gap: spacing.sm,
});

const $modalButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
  borderRadius: 8,
  alignItems: "center",
});

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.border,
});

const $confirmButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint,
});

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $confirmButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "white",
});

// === 테스트 관리 컴포넌트 ===

/**
 * 테스트 관리 섹션 컴포넌트
 * 확장 가능한 테스트 시스템을 제공합니다.
 */
function TestManagementSection() {
  const { themed, theme } = useAppTheme();
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);

  // 테스트 메뉴 데이터 - 새로운 테스트를 쉽게 추가할 수 있습니다
  const testMenus = [
    {
      id: "tag-search",
      title: "태그 검색 테스트",
      description: "태그 기반 검색 기능을 테스트합니다",
      icon: "search-outline",
      color: "#007AFF",
      component: TagSearchTest,
    },
    {
      id: "tag-navigation",
      title: "태그 네비게이션 테스트",
      description: "태그 클릭 시 네비게이션을 테스트합니다",
      icon: "navigate-outline",
      color: "#8B5CF6",
      component: TagNavigationTest,
    },
    // 새로운 테스트를 여기에 추가하세요
    // {
    //   id: "new-test",
    //   title: "새로운 테스트",
    //   description: "새로운 테스트 설명",
    //   icon: "flask-outline",
    //   color: "#10B981",
    //   component: NewTestComponent,
    // },
  ];

  /**
   * 테스트 실행
   */
  const runTest = (testId: string) => {
    setActiveTest(testId);
    setShowTestPanel(true);
  };

  /**
   * 테스트 패널 닫기
   */
  const closeTestPanel = () => {
    setShowTestPanel(false);
    setActiveTest(null);
  };

  /**
   * 현재 활성 테스트 컴포넌트 렌더링
   */
  const renderActiveTest = () => {
    const test = testMenus.find((t) => t.id === activeTest);
    if (!test) return null;

    const TestComponent = test.component;
    return <TestComponent />;
  };

  return (
    <>
      <View style={themed($section)}>
        <View style={themed($testSectionHeader)}>
          <Text style={themed($sectionTitle)}>테스트 관리</Text>
          <TouchableOpacity
            style={themed($testToggleButton)}
            onPress={() => setShowTestPanel(!showTestPanel)}
          >
            <Text style={themed($testToggleButtonText)}>
              {showTestPanel ? "테스트 패널 숨기기" : "테스트 패널 보기"}
            </Text>
          </TouchableOpacity>
        </View>

        {showTestPanel && (
          <>
            {/* 테스트 메뉴 */}
            <View style={themed($testMenuGrid)}>
              {testMenus.map((test) => (
                <TouchableOpacity
                  key={test.id}
                  style={themed($testMenuCard)}
                  onPress={() => runTest(test.id)}
                >
                  <View
                    style={[
                      themed($testMenuIconContainer),
                      { backgroundColor: test.color + "20" },
                    ]}
                  >
                    <Ionicons
                      name={test.icon as any}
                      color={test.color}
                      size={24}
                    />
                  </View>
                  <View style={themed($testMenuContent)}>
                    <Text style={themed($testMenuTitle)}>{test.title}</Text>
                    <Text style={themed($testMenuDescription)}>
                      {test.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="play-circle-outline"
                    color={test.color}
                    size={24}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* 테스트 실행 패널 */}
            {activeTest && (
              <View style={themed($testPanel)}>
                <View style={themed($testPanelHeader)}>
                  <Text style={themed($testPanelTitle)}>
                    {testMenus.find((t) => t.id === activeTest)?.title}
                  </Text>
                  <TouchableOpacity
                    onPress={closeTestPanel}
                    style={themed($testPanelCloseButton)}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>
                <View style={themed($testPanelContent)}>
                  {renderActiveTest()}
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </>
  );
}

// === 테스트 관리 스타일 ===

const $testSectionHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
});

const $testToggleButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "20",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $testToggleButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.tint,
  fontSize: 14,
  fontWeight: "600",
});

const $testMenuGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  gap: spacing.sm,
  marginBottom: spacing.md,
});

const $testMenuCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.card,
  padding: spacing.md,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
});

const $testMenuIconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  width: 48,
  height: 48,
  borderRadius: 24,
  justifyContent: "center",
  alignItems: "center",
  marginRight: spacing.md,
});

const $testMenuContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $testMenuTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.xs,
});

const $testMenuDescription: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $testPanel: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: "hidden",
});

const $testPanelHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $testPanelTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $testPanelCloseButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $testPanelContent: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 600,
});
