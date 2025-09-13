/**
 * NOTE: 피드 & 스토리 데이터 로딩 정책 개편 안내
 *
 * 현재 이 파일은 기존 useFeedPosts + (StorySection 내부 useStoryData) 조합으로
 * 매 화면 진입 시 네트워크 로드를 조건부 수행합니다.
 *
 * 새 캐싱 전략:
 *  - 중앙 메모리 캐시 유틸: feedStoryCache (TTL 1분)
 *  - 통합 훅: useFeedStoryData (피드 + 스토리 동시 캐시/새로고침 제어)
 *  - 화면 전환(프로필, 슬라이더, 기타 탭) 후 복귀 시:
 *      -> 1분 이내면 네트워크 재호출 없이 즉시 캐시된 posts/stories 표시
 *      -> 1분 이상 경과 & 앱/탭 비활성 → 활성 복귀 후 첫 접근 시에만 refresh
 *  - 수동 새로고침(Pull-To-Refresh)은 refreshFeed / refreshStories / refreshAll 호출
 *
 * 단계적 전환 가이드 (차후 적용 시):
 *  1) useFeedPosts 사용 구간을 useFeedStoryData로 교체
 *      const {
 *        posts, stories, loadingFeed, loadingStories,
 *        refreshFeed, refreshStories, refreshAll,
 *        needsFeedRefresh, needsStoryRefresh
 *      } = useFeedStoryData({ teamIds: selectedTeamIds });
 *
 *  2) 기존 posts 상태/새로고침 로직은 유지하되
 *     - 초기 마운트 시 needsFeedRefresh가 false면 setPosts(feedStoryCache.getFeed()!.posts) 형태로 즉시 반영
 *     - StorySection props로 stories/refreshStories 전달(또는 내부 훅 제거)
 *
 *  3) AppState / visibility 기반 1분 경과 처리(백그라운드 → 복귀)는 feedStoryCache 내부 handleForeground 로직이 수행
 *
 *  4) 기존 useFeedPosts의 팀 필터/차단 사용자 로직 등 추가 기능이 필요하면
 *     - useFeedStoryData에 확장 (페이지네이션, 필터별 캐시 Key 분리 등)
 *
 * 현재 커밋에서는 설명 주석만 추가하고 실제 전환 코드는 적용하지 않았습니다.
 * 추후 점진적 마이그레이션 시 이 주석을 참고하세요.
 */
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  View,
  Button,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import FeedNotice from "@/components/feed/notice/FeedNotice";
import { useRouter } from "expo-router";

import FeedList from "@/components/FeedList";
import AdFitBanner from "@/components/AdFitBanner";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

/**
 * 팬이 된 날짜부터 오늘까지의 기간을 년, 월, 일로 계산합니다.
 * @param favoriteDate 팬이 된 날짜 (ISO string)
 * @returns 년, 월, 총 일수 객체
 */
const formatFanDuration = (
  favoriteDate: string
): { years: number; months: number; totalDays: number } => {
  const startDate = new Date(favoriteDate);
  const endDate = new Date();

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return { years, months, totalDays };
};
import { Ionicons } from "@expo/vector-icons";
import StorySection from "@/components/StorySection";
import ChatRoomList from "@/components/chat/ChatRoomList";
import { NotificationToast } from "@/components/notifications";
import { showToast } from "@/components/CustomToast";
import PostCardSkeleton from "@/components/PostCardSkeleton";

import FeedHeader from "@/components/feed/FeedHeader";
import AuthModal from "@/components/feed/AuthModal";
import ListFooter from "@/components/feed/ListFooter";
import ShopModal from "@/components/shop/ShopModal";
import TeamFilterSelector from "@/components/TeamFilterSelector"; // 팀 필터 모달 (외부 제어)
import { useAuth } from "@/lib/auth/context/AuthContext";
import { useChatRooms } from "@/lib/hooks/useChatRooms";
import { useFeedPosts } from "@/lib/hooks/useFeedPosts";

// --- Type Definitions ---

export default function FeedScreen() {
  const { themed, theme, teamColorTeamId } = useAppTheme();
  const { t } = useTranslation();
  // 목록/로딩 상태는 전담 훅에서 관리
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [teamFilterOpen, setTeamFilterOpen] = useState(false); // 팀 필터 모달 외부 제어 상태
  const router = useRouter();
  const { user: currentUser, reloadUser: reloadCurrentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("feed");
  // 공지 섹션은 FeedNotice 컴포넌트로 분리 (로컬 상태 제거)

  // (공지 표시 로직은 FeedNotice 내부로 이동)

  // (닫기 로직은 FeedNotice 내부로 이동)
  // 레거시 useFeedPosts 훅으로 롤백 (고급 캐시 사용 취소)
  // useFeedPosts는 고유 분리된 상태명 사용 -> 기존 변수명과의 호환을 위해 매핑 변수 정의
  const {
    posts,
    fetching, // 기존 loadingInitial || loadingMore 대체
    error,
    isRefreshing,
    handleRefresh,
    handleLoadMore,
    selectedTeamIds,
    handleTeamFilterChange,
  } = useFeedPosts();

  // 기존 코드 호환을 위한 매핑 (필요 최소한)
  const loadingInitial = fetching;
  const loadingMore = false; // 구 훅은 별도 loadingMore 구분 없음
  const refreshing = isRefreshing;
  const hasNext = true; // 추가 페이지 여부는 내부 handleLoadMore에서 자체 판단
  const loadMore = handleLoadMore;
  const refresh = handleRefresh;
  const teamIds = selectedTeamIds;
  const setTeamFilter = handleTeamFilterChange;

  const {
    chatRooms,
    isLoading: chatRoomsLoading,
    loadChatRooms,
    lastError,
  } = useChatRooms({ autoLoad: true });

  useEffect(() => {
    if (lastError) {
      showToast({
        type: "error",
        title: "채팅방 로드 실패",
        message: "채팅방 목록을 불러오는데 실패했습니다.",
        duration: 3000,
      });
    }
  }, [lastError]);

  const handleLoginSuccess = () => {
    setAuthModalVisible(false);
  };

  /**
   * 알림 버튼 클릭 핸들러
   */
  const handleNotificationPress = () => {
    router.push("/(details)/notifications");
  };

  /**
   * 상점 버튼 클릭 핸들러
   */
  const handleShopPress = () => {
    if (!currentUser) {
      setAuthModalVisible(true);
      return;
    }
    setShopModalVisible(true);
  };

  /**
   * 추첨 버튼 클릭 핸들러
   */
  const handleLotteryPress = () => {
    if (!currentUser) {
      setAuthModalVisible(true);
      return;
    }
    router.push("/(modals)/lottery");
  };

  /**
   * 상세 게시판 버튼 클릭 핸들러
   */
  const handleBoardPress = () => {
    if (!currentUser) {
      setAuthModalVisible(true);
      return;
    }
    router.push("/(details)/board");
  };

  /**
   * 상점 아이템 구매 핸들러
   */
  const handleShopPurchase = async (item: any) => {
    // 실제로는 GraphQL mutation을 호출해야 함
    // 여기서는 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 사용자 정보 새로고침 (포인트 업데이트)
    await reloadCurrentUser();

    showToast({
      type: "success",
      title: "구매 완료",
      message: `${item.name}을(를) 성공적으로 구매했습니다!`,
      duration: 3000,
    });
  };

  /**
   * 알림 토스트 클릭 핸들러
   */
  const handleNotificationToastPress = (notification: any) => {
    // 알림 타입에 따라 적절한 화면으로 이동
    if (notification.post) {
      router.push({
        pathname: "/(details)/post/[postId]",
        params: { postId: notification.post.id },
      });
    } else if (notification.user) {
      router.push("/(app)/profile");
    }
  };

  // 팀 필터 선택 핸들러는 useFeedPosts 훅에서 제공됨
  // 목록 재조회 효과는 훅 내부에서 처리됨
  // 팀 필터 변경 시 강제 새로고침 (popover 통해 변경 시 refetch 누락 방지)
  // (구) 필터 초기화/변경 useEffect 제거: useAdvancedFeed 내부에서 teamIds 변경 시 자동 처리

  // 게시물 작성 완료 후 피드 새로고침을 위한 useEffect
  useEffect(() => {
    return () => {};
  }, [refresh]);

  // 탭 데이터 (FeedHeader 로 전달하여 내부 TabSlider 렌더)
  const tabs = [
    { key: "feed", title: t(TRANSLATION_KEYS.FEED_TITLE) },
    { key: "chat", title: t(TRANSLATION_KEYS.FEED_CHAT) },
  ];

  if (fetching && posts.length === 0 && !refreshing) {
    return (
      <View style={themed($container)}>
        <FeedHeader
          onNotificationPress={handleNotificationPress}
          onProfilePress={() =>
            currentUser
              ? router.push("/(app)/profile")
              : setAuthModalVisible(true)
          }
          onShopPress={handleShopPress}
          onLotteryPress={handleLotteryPress}
          onBoardPress={handleBoardPress}
          onTeamFilterPress={() => setTeamFilterOpen(true)}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <View>
          {Array.from({ length: 5 }).map((_, index) => (
            <PostCardSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={themed($centeredContainer)}>
        <Text style={themed($errorText)}>
          {t(TRANSLATION_KEYS.FEED_ERROR_FETCHING, { message: error.message })}
        </Text>
        <Button
          title={t(TRANSLATION_KEYS.COMMON_RETRY)}
          onPress={refresh}
          color={theme.colors.tint}
        />
      </View>
    );
  }

  const footerLoading = fetching && !refreshing;

  return (
    <View style={themed($container)}>
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 헤더 (탭 슬라이더 포함) */}
      <FeedHeader
        onNotificationPress={handleNotificationPress}
        onProfilePress={() =>
          currentUser
            ? router.push("/(app)/profile")
            : setAuthModalVisible(true)
        }
        onShopPress={handleShopPress}
        onLotteryPress={handleLotteryPress}
        onBoardPress={handleBoardPress}
        onTeamFilterPress={() => setTeamFilterOpen(true)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 선택된 테마 팀(favoriteDate) 정보 표시 */}
      {currentUser?.myTeams && currentUser.myTeams.length > 0 && (
        <>
          <View style={themed($myTeamContainer)}>
            {(() => {
              const selectedTeam = teamColorTeamId
                ? currentUser.myTeams.find(
                    (ut) => ut.team.id === teamColorTeamId
                  )
                : undefined;

              const fallbackTeam = currentUser.myTeams
                .slice()
                .sort((a, b) => a.priority - b.priority)[0];

              const displayTeam = selectedTeam || fallbackTeam;

              if (!displayTeam) return null;

              const favDate = displayTeam.favoriteDate;
              const duration = favDate ? formatFanDuration(favDate) : null;

              return (
                <View style={themed($myTeamItem)}>
                  <Ionicons
                    name="baseball-outline"
                    size={20}
                    color={theme.colors.tint}
                  />

                  {duration ? (
                    <>
                      <Text style={themed($myTeamText)}>
                        {displayTeam.team.name}
                      </Text>
                      <Text style={themed($myTeamDate)}>
                        {", 함께 한지"}
                        <Text style={themed($myTeamDays)}>
                          {" "}
                          ({duration.totalDays}일){" "}
                        </Text>
                        {duration.years > 0
                          ? `${duration.years}년째..`
                          : `${duration.months + 1}개월째..`}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={themed($myTeamDate)}
                      onPress={() => router.push("/(modals)/team-selection")}
                    >
                      <Text style={themed($myTeamText)}>
                        {displayTeam.team.name}
                      </Text>
                      {", 클릭하여 "}
                      <Text style={themed($myTeamDateUnderline)}>
                        처음 좋아한 날
                      </Text>
                      {"을 기록하세요."}
                    </Text>
                  )}
                  {duration && (
                    <Ionicons
                      name="heart"
                      size={16}
                      color={theme.colors.tint}
                    />
                  )}
                </View>
              );
            })()}
          </View>

          {/* 공지 섹션 제거: 상단으로 이동 */}
          <FeedNotice />
        </>
      )}

      {/* 상점 모달 */}
      <ShopModal
        visible={shopModalVisible}
        onClose={() => setShopModalVisible(false)}
        currentUser={currentUser}
        onPurchase={handleShopPurchase}
      />
      {/* 팀 필터 선택 모달 */}
      <TeamFilterSelector
        onTeamSelect={setTeamFilter}
        selectedTeamIds={teamIds}
        loading={fetching}
        open={teamFilterOpen}
        onOpenChange={setTeamFilterOpen}
        hideTriggerButton
      />

      {/* 로그인 버튼 섹션 (로그인 안 된 경우에만 표시) */}
      {!currentUser && (
        <View style={themed($loginContainer)}>
          <TouchableOpacity
            style={themed($loginButton)}
            onPress={() => setAuthModalVisible(true)}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={themed($loginButtonText)}>
              {t(TRANSLATION_KEYS.AUTH_SIGNUP_LOGIN)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 탭 콘텐츠 (TabSlider 는 FeedHeader 로 이동) */}
      {activeTab === "feed" ? (
        <>
          <FeedList
            posts={posts}
            fetching={fetching}
            refreshing={refreshing}
            onRefresh={refresh}
            onEndReached={loadMore}
            onFeedRefresh={refresh}
            ListHeaderComponent={
              currentUser ? (
                <StorySection
                  teamIds={teamIds}
                  currentUser={currentUser}
                  feedPosts={posts}
                />
              ) : null
            }
            ListFooterComponent={
              <ListFooter loading={footerLoading} error={error} />
            }
          />

          {/* FeedList 아래에 AdFit 광고 배너 */}
          <AdFitBanner adUnit="DAN-HsqnHzDgRAYX6iDy" width={320} height={50} />
        </>
      ) : (
        <ChatRoomList
          currentUser={currentUser}
          showHeader={false}
          rooms={chatRooms.map((r) => ({
            ...r,
            type: r.type as "PRIVATE" | "GROUP" | "PUBLIC" | undefined,
            members: r.members || [],
            createdAt: r.createdAt || new Date().toISOString(),
          }))}
          isLoading={chatRoomsLoading}
          onRefresh={loadChatRooms}
        />
      )}

      {/* 실시간 알림 토스트 */}
      {currentUser && (
        <NotificationToast
          onPress={handleNotificationToastPress}
          position="top"
          duration={4000}
        />
      )}

      {/* 게시물 작성 플로팅 버튼 */}
      {currentUser && (
        <TouchableOpacity
          style={themed($createPostButton)}
          onPress={() => router.push("/(modals)/create-post")}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Styles ---
//
// 커밋 메세지: refactor(feed): TabSlider 헤더로 이관 및 FeedHeader tabs/activeTab/onTabChange 전달

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $centeredContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  padding: 16,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  fontSize: 18,
  textAlign: "center",
  marginBottom: 16,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  color: colors.text,
  fontSize: 16,
});

const $loginContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.md,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  backgroundColor: colors.backgroundAlt,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $loginButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 12,
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  elevation: 5,
});

const $loginButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "700",
});

const $scrollContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $feedContainer: ThemedStyle<ViewStyle> = () => ({
  // PostCard 자체에 마진이 있으므로 추가 패딩 불필요
});

const $loadingFooter: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.lg,
  gap: spacing.sm,
});

const $myTeamContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  borderBottomColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
});

const $myTeamItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.xxs,
});

const $myTeamText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.teamMain ?? colors.tint,
  fontSize: 15,
  fontWeight: "800",
  // marginRight: -4,
});

const $myTeamDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 15,
  fontWeight: "400",
});

const $myTeamDateUnderline: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 15,
  fontWeight: "800",
  textDecorationLine: "underline",
});

const $myTeamDays: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  fontWeight: "400",
  color: colors.textDim,
});

/* 공지 섹션 스타일 */
/* 공지 섹션 스타일 제거됨 (FeedNotice 내부로 이전) */

const $createPostButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  bottom: spacing.xl,
  right: spacing.md,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.tint,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: colors.tint,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
  zIndex: 1000,
});

// 헤더/모달/푸터 관련 스타일은 분리된 컴포넌트 내부로 이동
