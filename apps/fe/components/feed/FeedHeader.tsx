import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import UserAvatar from "@/components/users/UserAvatar";
import ProfileContextPopover from "@/components/shared/ProfileContextPopover";
import TeamFilterSelector from "@/components/TeamFilterSelector";
import { NotificationBadge } from "@/components/notifications";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import type { User } from "@/lib/auth";

interface FeedHeaderProps {
  currentUser: User | null;
  selectedTeamIds: string[] | null;
  onTeamSelect: (ids: string[] | null) => void;
  onNotificationPress: () => void;
  onCreatePress: () => void;
  onProfilePress: () => void;
}

/**
 * 피드 상단 헤더 컴포넌트
 * - 팀 필터, 알림, 글쓰기, 프로필 버튼을 포함합니다.
 */
export default function FeedHeader({
  currentUser,
  selectedTeamIds,
  onTeamSelect,
  onNotificationPress,
  onCreatePress,
  onProfilePress,
}: FeedHeaderProps) {
  const { themed, theme } = useAppTheme();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const anchorRef = React.useRef<View>(null);

  const handleProfilePress = () => {
    if (currentUser) {
      // 로그인 상태면 컨텍스트 메뉴 오픈
      setProfileMenuVisible(true);
    } else {
      // 비로그인 상태면 기존 프로필(=로그인/프로필) 화면 이동
      onProfilePress();
    }
  };

  return (
    <View style={themed($header)}>
      <View style={themed($headerLeft)}>
        <Text style={themed($logoText)}>SportCom</Text>
      </View>
      <View style={themed($headerRight)}>
        {currentUser && (
          <View style={themed($pointsBadge)}>
            <Text style={themed($pointsText)}>
              💰: {currentUser.points ?? 0}
            </Text>
          </View>
        )}
        {currentUser && (
          <>
            <TeamFilterSelector
              onTeamSelect={onTeamSelect}
              selectedTeamIds={selectedTeamIds}
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
          ref={anchorRef}
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
      {/* 프로필 컨텍스트 팝오버: 헤더 우측 아바타 아래 위치 */}
      {currentUser && (
        <ProfileContextPopover
          visible={profileMenuVisible}
          onClose={() => setProfileMenuVisible(false)}
          onOpenProfile={() => {
            setProfileMenuVisible(false);
            onProfilePress();
          }}
          anchorStyle={{
            top: 46,
            right: 10,
          }}
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
  fontStyle: "italic",
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
