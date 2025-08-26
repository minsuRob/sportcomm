import React from "react";
import { useTranslation } from 'react-i18next';
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
import TeamFilterSelector from "@/components/TeamFilterSelector";
import { NotificationBadge } from "@/components/notifications";
import { useAppTheme } from "@/lib/theme/context";
import { typography } from "@/lib/theme/typography";
import type { ThemedStyle } from "@/lib/theme/types";
import type { User } from "@/lib/auth";

interface FeedHeaderProps {
  currentUser: User | null;
  selectedTeamIds: string[] | null;
  onTeamSelect: (ids: string[] | null) => void;
  loading?: boolean;
  onNotificationPress: () => void;
  onCreatePress: () => void;
  onProfilePress: () => void;
  onShopPress: () => void;
  onLotteryPress: () => void;
  onBoardPress: () => void; // 상세 게시판 버튼 클릭 핸들러 추가
}

/**
 * 피드 상단 헤더 컴포넌트
 * - 팀 필터, 알림, 글쓰기, 프로필 버튼을 포함합니다.
 */
export default function FeedHeader({
  currentUser,
  selectedTeamIds,
  onTeamSelect,
  loading = false,
  onNotificationPress,
  onCreatePress,
  onProfilePress,
  onShopPress,
  onLotteryPress,
  onBoardPress, // 상세 게시판 버튼 클릭 핸들러 추가
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

  return (
    <View style={themed($header)}>
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
                {t('points', { points: currentUser.points ?? 0 })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={themed($boardButton)}
              onPress={onBoardPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t("list-outline")}
                size={20}
                color={theme.colors.tint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={themed($lotteryButton)}
              onPress={onLotteryPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t("ticket-outline")}
                size={20}
                color={theme.colors.tint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={themed($shopButton)}
              onPress={onShopPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={t("storefront-outline")}
                size={20}
                color={theme.colors.tint}
              />
            </TouchableOpacity>
          </>
        )}
        {currentUser && (
          <>
            <TeamFilterSelector
              onTeamSelect={onTeamSelect}
              selectedTeamIds={selectedTeamIds}
              loading={loading}
            />
            <TouchableOpacity
              style={themed($iconButton)}
              onPress={onNotificationPress}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={theme.colors.text}
              />
              <NotificationBadge size="small" />
            </TouchableOpacity>
          </>
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
              name={t("person-outline")}
              size={22}
              color={theme.colors.text}
            />
          )}
        </TouchableOpacity>
      </View>
      {/* 프로필 컨텍스트 팝오버: 헤더 우측 아바타 아래 위치 */}
      {currentUser && (
        <ProfileContextPopover
          visible={profileMenuVisible}
          onClose={() => setProfileMenuVisible(false)}
          onOpenProfile={() => {
            setProfileMenuVisible(false);
            onProfilePress();
          }}
          anchorStyle={popoverPosition}
        />
      )}
    </View>
  );
}

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

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  width: 100,
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
  color: colors.tint,
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

const $lotteryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.tint + "15",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.tint + "30",
  marginRight: spacing.xs,
});

const $shopButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.tint + "15",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.tint + "30",
  marginRight: spacing.xs,
});

const $boardButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: colors.tint + "15",
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 1,
  borderColor: colors.tint + "30",
  marginRight: spacing.xs,
});
