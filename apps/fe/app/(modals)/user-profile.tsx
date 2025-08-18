import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import UserProfileModal from "@/components/profile/UserProfileModal";

/**
 * 다른 사용자의 프로필을 표시하는 모달 화면
 * URL 파라미터로 userId를 받아서 해당 사용자의 프로필을 표시합니다
 *
 * 사용법: router.push(`/(modals)/user-profile?userId=${userId}`)
 */
export default function UserProfileModalScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  if (!userId) {
    // userId가 없으면 자동으로 뒤로 가기
    router.back();
    return null;
  }

  return <UserProfileModal userId={userId} onClose={handleClose} />;
}
