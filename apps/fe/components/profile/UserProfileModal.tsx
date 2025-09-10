import React from "react";
import ProfileScreen from "@/app/(app)/profile";

interface UserProfileModalProps {
  userId: string;
  onClose?: () => void;
}

/**
 * 다른 사용자의 프로필을 표시하는 모달 컴포넌트
 * ProfileScreen을 재사용하여 일관된 UI를 제공합니다
 */
export default function UserProfileModal({
  userId,
  onClose,
}: UserProfileModalProps) {
  return (
    <ProfileScreen
      userId={userId}
      isModal={true}
      onClose={onClose}
    />
  );
}
