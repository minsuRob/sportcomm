import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import AuthForm from "@/components/AuthForm";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useTranslation, TRANSLATION_KEYS } from "@/lib/i18n/useTranslation";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

/**
 * 인증 모달 컴포넌트
 * - 로그인/회원가입 폼을 모달로 표시합니다.
 */
export default function AuthModal({
  visible,
  onClose,
  onLoginSuccess,
}: AuthModalProps) {
  const { themed } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          <AuthForm onLoginSuccess={onLoginSuccess} />
        </View>
        <TouchableOpacity onPress={onClose} style={themed($closeButton)}>
          <Text style={themed($closeButtonText)}>
            {t(TRANSLATION_KEYS.COMMON_CLOSE)}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0, 0, 0, 0.8)",
});

const $modalContent: ThemedStyle<ViewStyle> = () => ({
  width: "100%",
  maxWidth: 500,
  padding: 16,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 40,
  right: 20,
  backgroundColor: colors.background,
  borderRadius: 9999,
  padding: 8,
});

const $closeButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "bold",
  fontSize: 18,
});
