import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import { useAppTheme } from "@/lib/theme/context";
import { useModerationActions } from "@/hooks/useModerationActions";

export interface UserContextMenuProps {
  visible: boolean;
  onClose: () => void;
  targetUser: {
    id: string;
    nickname: string;
  };
  currentUserId?: string | null;
  onBlockUser?: (blockedUserId: string) => void;
}

/**
 * 사용자 대상 컨텍스트 메뉴 (신고/차단)
 */
export default function UserContextMenu({
  visible,
  onClose,
  targetUser,
  currentUserId,
  onBlockUser,
}: UserContextMenuProps) {
  const { theme } = useAppTheme();
  const { blockUser, openReportModal } = useModerationActions(onBlockUser);

  const isOwnProfile = currentUserId === targetUser.id;

  const options: ActionSheetOption[] = useMemo(() => {
    const opts: ActionSheetOption[] = [];

    if (!isOwnProfile) {
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
  }, [theme, targetUser, isOwnProfile, blockUser, openReportModal, onClose]);

  if (options.length === 0) {
    return null; // 본인 프로필 등 표시할 옵션이 없으면 렌더링 안함
  }

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title={`${targetUser.nickname}님 옵션`}
      options={options}
    />
  );
}
