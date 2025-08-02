import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { showToast } from "@/components/CustomToast";

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
        onPress: () => router.push("/(admin)/users"),
      },
      {
        title: "총 게시물",
        value: stats.totalPosts.toLocaleString(),
        icon: "document-text-outline",
        color: "#10B981",
        onPress: () => router.push("/(admin)/posts"),
      },
      {
        title: "채팅방",
        value: stats.totalChatRooms.toLocaleString(),
        icon: "chatbubbles-outline",
        color: "#8B5CF6",
        onPress: () => router.push("/(admin)/chat-rooms"),
      },
      {
        title: "신고",
        value: stats.totalReports.toLocaleString(),
        icon: "flag-outline",
        color: "#EF4444",
        onPress: () => router.push("/(admin)/reports"),
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
      onPress: () => router.push("/(admin)/users"),
    },
    {
      title: "채팅방 관리",
      description: "채팅방 생성, 삭제 및 설정",
      icon: "chatbubbles-outline",
      color: "#8B5CF6",
      onPress: () => router.push("/(admin)/chat-rooms"),
    },
    {
      title: "팀 관리",
      description: "스포츠 팀 추가, 수정 및 삭제",
      icon: "trophy-outline",
      color: "#F59E0B",
      onPress: () => router.push("/(admin)/teams"),
    },
    {
      title: "게시물 관리",
      description: "게시물 모니터링 및 관리",
      icon: "document-text-outline",
      color: "#10B981",
      onPress: () => router.push("/(admin)/posts"),
    },
    {
      title: "신고 관리",
      description: "사용자 신고 처리 및 관리",
      icon: "flag-outline",
      color: "#EF4444",
      onPress: () => router.push("/(admin)/reports"),
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
