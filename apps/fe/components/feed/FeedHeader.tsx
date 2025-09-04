import React from "react";
import { useTranslation } from "react-i18next";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "@/components/users/UserAvatar";
import ProfileContextPopover from "@/components/shared/ProfileContextPopover";

import { NotificationBadge } from "@/components/notifications";
import { useAppTheme } from "@/lib/theme/context";
import { typography } from "@/lib/theme/typography";
import type { ThemedStyle } from "@/lib/theme/types";
import type { User } from "@/lib/auth";
import TabSlider from "@/components/TabSlider";

interface FeedHeaderProps {
  currentUser: User | null;
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onShopPress: () => void;
  onLotteryPress: () => void;
  onBoardPress: () => void; // 상세 게시판 버튼 클릭 핸들러
  onTeamFilterPress: () => void; // 프로필 팝오버에서 팀 필터 열기
  // TabSlider 이관 관련 (옵션: 기존 사용처 호환 유지)
  tabs?: { key: string; title: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
}

/**
 * 피드 상단 헤더 컴포넌트
 * - 팀 필터, 알림, 글쓰기, 프로필 버튼을 포함합니다.
 * - 팀 컬러 오버라이드 도입: theme.colors.teamMain / teamSub (fallback: tint/accent)
 * - 상세 게시판 버튼을 ProfileContextPopover 로 이관 (onBoardPress)
 */
export default function FeedHeader({
  currentUser,
  onNotificationPress,
  onProfilePress,
  onShopPress,
  onLotteryPress,
  onBoardPress,
  onTeamFilterPress,
  tabs,
  activeTab,
  onTabChange,
}: FeedHeaderProps) {
  const { t } = useTranslation();
  const { themed, theme } = useAppTheme();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const [popoverPosition, setPopoverPosition] = React.useState({
    top: 0,
    right: 0,
  });

  // 프로필 버튼의 ref를 생성하여 위치 측정에 사용
  const profileButtonRef = React.useRef<View>(null);

  const handleProfilePress = (event: GestureResponderEvent) => {
    if (currentUser) {
      // React Native에서는 ref를 통해 measure 함수에 접근해야 함
      profileButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
        const windowWidth = Dimensions.get("window").width;
        const right = windowWidth - pageX - width;

        setPopoverPosition({
          top: pageY + height + 8,
          right: right,
        });
        setProfileMenuVisible(true);
      });
    } else {
      onProfilePress();
    }
  };

  // 팀 메인/서브 컬러 (fallback 처리)
  const teamMain = theme.colors.teamMain ?? theme.colors.tint;

  return (
    <View style={themed($header)}>
      {/* 1행: 로고 + 우측 버튼들 */}
      <View style={themed($headerRow)}>
        <View style={themed($headerLeft)}>
          <Text style={themed($logoText)}>{t("SportCom")}</Text>
        </View>
        <View style={themed($headerRight)}>
          {currentUser && (
            <>
              <TouchableOpacity
                style={themed($pointsBadge)}
                onPress={onShopPress}
                activeOpacity={0.7}
              >
                <Text style={themed($pointsText)}>
                  {t("points", { points: currentUser.points ?? 0 })}
                </Text>
              </TouchableOpacity>
              {/* 상세 게시판 버튼: ProfileContextPopover 메뉴로 이동됨 (onBoardPress) */}
              {/* 로또(이벤트) 버튼: ProfileContextPopover 메뉴로 이동됨 */}
              {/* 샵 버튼: ProfileContextPopover 메뉴로 이동됨 */}
            </>
          )}
          {currentUser && (
            <TouchableOpacity
              style={themed($boardButton)}
              onPress={onNotificationPress}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={teamMain}
              />
              <NotificationBadge size="small" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            ref={profileButtonRef}
            style={themed($iconButton)}
            onPress={handleProfilePress}
          >
            {currentUser ? (
              <UserAvatar
                imageUrl={currentUser.profileImageUrl}
                name={currentUser.nickname}
                size={28}
              />
            ) : (
              <Ionicons
                name="person-outline"
                size={22}
                color={theme.colors.text}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 2행: 탭 슬라이더 (옵션) */}
      {tabs && tabs.length > 0 && (
        <TabSlider
          tabs={tabs}
          /* activeTab 없으면 첫 번째 탭 사용 (안전 fallback) */
          activeTab={activeTab ?? tabs[0].key}
          onTabChange={(k) => onTabChange?.(k)}
          variant="header"
        />
      )}

      {/* 프로필 컨텍스트 팝오버: 헤더 우측 아바타 아래 위치 */}
      {currentUser && (
        <ProfileContextPopover
          visible={profileMenuVisible}
          onClose={() => setProfileMenuVisible(false)}
          onOpenProfile={() => {
            setProfileMenuVisible(false);
            onProfilePress();
          }}
          onShopPress={() => {
            setProfileMenuVisible(false);
            onShopPress();
          }}
          onLotteryPress={() => {
            setProfileMenuVisible(false);
            onLotteryPress();
          }}
          onBoardPress={() => {
            setProfileMenuVisible(false);
            onBoardPress();
          }}
          onTeamFilterPress={() => {
            setProfileMenuVisible(false);
            onTeamFilterPress();
          }}
          anchorStyle={popoverPosition}
        />
      )}
    </View>
  );
}

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "column",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.xs,
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  width: 120,
  justifyContent: "center",
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  flex: 1,
  textAlign: "center",
});

const $logoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "900",
  // 팀 색상 오버라이드 시 teamMain 사용, 없으면 기본 tint
  color: colors.teamMain ?? colors.tint,
  fontFamily: typography.logo.normal,
});

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: spacing.xs,
});

const $iconButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.backgroundAlt,
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
});

const $pointsBadge: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  height: 28,
  borderRadius: 14,
  backgroundColor: colors.backgroundAlt,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.xs,
});

const $pointsText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 12,
  fontWeight: "700",
});

// 아래 버튼은 teamMain 기준 반투명 배경/테두리
const $boardButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => {
  const main = colors.teamMain ?? colors.tint;
  return {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: main + "15",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: main + "30",
    marginRight: spacing.xs,
  };
};

/* 헤더 1행(Row) 스타일 */
const $headerRow: ThemedStyle<ViewStyle> = ({}) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  marginBottom: 4,
});

/*
커밋 메세지: refactor(feed): 불필요한 prop(onCreatePress) 및 미사용 스타일($lotteryButton, $shopButton) 제거
추가 커밋 메세지: feat(feed header): TabSlider 헤더 내 임베드 및 상태 리프트 (tabs/activeTab/onTabChange props)
추가 커밋 메세지: refactor(feed header): 상세 게시판 버튼 Popover 이동(onBoardPress prop 전달)
*/
