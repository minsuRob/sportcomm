import React, { useEffect } from "react";
import { useRouter } from "expo-router";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

/**
 * 인증 모달 컴포넌트
 * - 이제 독립적인 auth screen으로 라우팅합니다.
 */
export default function AuthModal({
  visible,
  onClose,
  onLoginSuccess,
}: AuthModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      // 모달이 열리면 auth screen으로 이동
      router.push("/(details)/auth");
      onClose(); // 모달 상태 초기화
    }
  }, [visible, router, onClose]);

  // 실제 모달은 렌더링하지 않음 (screen으로 대체)
  return null;
}
