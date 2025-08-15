import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import { useAppTheme } from "@/lib/theme/context";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useModerationActions } from "@/hooks/useModerationActions";

export interface ProfileContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfile?: () => void; // 내 프로필 보기
  targetUser?: { id: string; nickname: string };
  currentUserId?: string | null;
  onBlockUser?: (blockedUserId: string) => void;
}

/**
 * 프로필 및 사용자 상호작용을 위한 컨텍스트 메뉴
 * - 내 프로필/설정 메뉴와 다른 사용자 신고/차단 메뉴를 조건부로 렌더링합니다.
 */
export default function ProfileContextMenu({
  visible,
  onClose,
  onOpenProfile,
  targetUser,
  currentUserId,
  onBlockUser,
}: ProfileContextMenuProps) {
  const { theme, toggleTheme, setAppColor, appColor } = useAppTheme();
  const { currentLanguage, switchLanguage } = useTranslation();
  const { blockUser, openReportModal } = useModerationActions(onBlockUser);

  const isMyProfile = !targetUser || currentUserId === targetUser.id;

  const options: ActionSheetOption[] = useMemo(() => {
    const opts: ActionSheetOption[] = [];

    if (isMyProfile) {
      // 내 프로필 설정 메뉴
      if (onOpenProfile) {
        opts.push({
          text: "내 프로필 열기",
          onPress: onOpenProfile,
          icon: (
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={theme.colors.text}
            />
          ),
        });
      }
      opts.push(
        {
          text: theme.isDark ? "라이트 테마로" : "다크 테마로",
          onPress: toggleTheme,
          icon: (
            <Ionicons
              name={theme.isDark ? "sunny-outline" : "moon-outline"}
              size={20}
              color={theme.colors.text}
            />
          ),
        },
        {
          text: currentLanguage === "ko" ? "English로 전환" : "한국어로 전환",
          onPress: () => switchLanguage(currentLanguage === "ko" ? "en" : "ko"),
          icon: (
            <Ionicons
              name="globe-outline"
              size={20}
              color={theme.colors.text}
            />
          ),
        }
      );
    } else if (targetUser) {
      // 다른 사용자 메뉴 (신고/차단)
      opts.push(
        {
          text: "신고하기",
          onPress: () => {
            openReportModal({
              userId: targetUser.id,
              userName: targetUser.nickname,
            });
            onClose();
          },
          style: "destructive",
          icon: (
            <Ionicons
              name="flag-outline"
              color={theme.colors.error}
              size={20}
            />
          ),
        },
        {
          text: `${targetUser.nickname}님 차단하기`,
          onPress: () => {
            blockUser(targetUser.id, targetUser.nickname);
            onClose();
          },
          style: "destructive",
          icon: (
            <Ionicons
              name="person-remove-outline"
              color={theme.colors.error}
              size={20}
            />
          ),
        }
      );
    }

    return opts;
  }, [
    theme,
    toggleTheme,
    currentLanguage,
    switchLanguage,
    appColor,
    setAppColor,
    onOpenProfile,
    isMyProfile,
    targetUser,
    blockUser,
    openReportModal,
    onClose,
  ]);

  const title = isMyProfile
    ? "프로필 메뉴"
    : `${targetUser?.nickname ?? ""}님 옵션`;

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title={title}
      options={options}
    />
  );
}
