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

import { useAppTheme } from "@/lib/theme/context";
import { typography } from "@/lib/theme/typography";
import type { ThemedStyle } from "@/lib/theme/types";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import TabSlider from "@/components/TabSlider";
import { useRouter } from "expo-router";

interface FeedHeaderProps {
  onNotificationPress: () => void;
  onProfilePress: () => void;
  onShopPress: () => void;
  onLotteryPress: () => void;
  onBoardPress: () => void; // 상세 게시판 버튼 클릭 핸들러
  onTeamFilterPress: () => void; // 프로필 팝오버에서 팀 필터 열기
  tabs?: { key: string; title: string }[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  selectedTeamIds?: string[] | null; // 인라인 팀 필터 버튼 표시용 (선택된 팀 개수 표시)
}

/**
 * 피드 상단 헤더 컴포넌트
 * - 동일 1행 라인에 로고 / 탭 / 우측 액션 배치
 * - 탭 너비는 헤더 전체의 약 25% (최소 가로폭 확보)
 */
export default function FeedHeader({
  onNotificationPress,
  onProfilePress,
  onShopPress,
  onLotteryPress,
  onBoardPress,
  onTeamFilterPress,
  tabs,
  activeTab,
  onTabChange,
  selectedTeamIds,
}: FeedHeaderProps) {
  const { t } = useTranslation();
  const { themed, theme } = useAppTheme();
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [profileMenuVisible, setProfileMenuVisible] = React.useState(false);
  const [popoverPosition, setPopoverPosition] = React.useState({
    top: 0,
    right: 0,
  });

  const profileButtonRef = React.useRef<View>(null);

  const handleProfilePress = (event: GestureResponderEvent) => {
    if (currentUser) {
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
      // currentUser가 없으면 로그인 페이지로 이동
      router.push("/auth");
    }
  };

  return (
    <View style={themed($header)}>
      {/* 1행: 로고 + (탭) + 우측 버튼들 */}
      <View style={themed($headerRow)}>
        <View style={themed($headerLeft)}>
          <View style={themed($logoRow)}>
            <Text style={themed($logoText)}>sp</Text>
            <Ionicons
              name="baseball"
              size={16}
              color={theme.colors.teamMain ?? theme.colors.tint}
              style={themed($baseballIcon) as any}
            />
            <Text style={themed($logoText)}>rtalk</Text>
          </View>
        </View>

        {/* {tabs && tabs.length > 0 && (
          <View style={themed($tabCenterOverlay)} pointerEvents="box-none">
            <View style={themed($tabInlineCenter)} pointerEvents="auto">
              <TabSlider
                tabs={tabs}
                activeTab={activeTab ?? tabs[0].key}
                onTabChange={(k) => onTabChange?.(k)}
                variant="header"
                height={32}
              />
            </View>
          </View>
        )} */}

        <View style={themed($headerRight)}>
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
          onNotificationPress={() => {
            setProfileMenuVisible(false);
            onNotificationPress();
          }}
          anchorStyle={popoverPosition}
        />
      )}
    </View>
  );
}

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "column",
  paddingHorizontal: spacing.sm,
  paddingTop: spacing.xxxs,
  paddingBottom: spacing.xs,
  backgroundColor: colors.card,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerLeft: ThemedStyle<ViewStyle> = () => ({
  width: 120,
  justifyContent: "center",
});

const $logoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "900",
  color: colors.teamMain ?? colors.tint,
  // 웹/네이티브 모두 동일 키(TTTogether) 사용
  fontFamily: "TTTogether",
});

const $baseballIcon: ThemedStyle<ViewStyle> = () => ({
  marginTop: 5,
  marginLeft: -4,
  marginRight: -4,
});

const $logoRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing?.xxs ?? 4,
});

const $headerRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  marginLeft: "auto",
  // 우측 끝으로 자연스럽게 정렬
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

const $headerRow: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  width: "100%",
  // space-between 제거 -> 중앙 탭 영역 배치 위해 직접 margin 제어
});

const $tabCenterOverlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "box-none",
});

const $tabInlineCenter: ThemedStyle<ViewStyle> = () => ({
  minWidth: 180,
  maxWidth: 320,
  alignSelf: "center",
  pointerEvents: "auto",
});

const $teamFilterInline: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.backgroundAlt,
  borderRadius: 18,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  marginRight: spacing.sm,
  gap: spacing.xxs,
  minHeight: 32,
});

const $teamFilterInlineText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
  fontWeight: "600",
  maxWidth: 60,
});

/*
커밋 메세지: feat(feed header): TabSlider 1행 내 25% 폭 중앙 배치 및 2행 제거
추가 커밋 메세지: feat(feed header): 인라인 팀 필터 버튼 추가 (TeamFilterSelector 접근성 복구)
추가 커밋 메세지: refactor(feed header): 알림 버튼 제거 및 ProfileContextPopover로 이관
*/
