import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

export interface ActionSheetOption {
  text: string;
  onPress: () => void;
  style?: "default" | "destructive" | "cancel";
  icon?: React.ReactNode;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
}

/**
 * 공통 액션시트 컴포넌트
 * 신고/차단 등 다양한 옵션을 표시할 때 사용
 */
export default function ActionSheet({
  visible,
  onClose,
  title,
  message,
  options,
}: ActionSheetProps) {
  const { themed, theme } = useAppTheme();

  const handleOptionPress = (option: ActionSheetOption) => {
    option.onPress();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={themed($modalOverlay)}>
        <TouchableOpacity
          style={themed($backdrop)}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={themed($modalContent)}>
          {/* 헤더 */}
          {(title || message) && (
            <View style={themed($header)}>
              {title && <Text style={themed($title)}>{title}</Text>}
              {message && <Text style={themed($message)}>{message}</Text>}
              <TouchableOpacity onPress={onClose} style={themed($closeButton)}>
                <Ionicons name="close" color={theme.colors.textDim} size={20} />
              </TouchableOpacity>
            </View>
          )}

          {/* 옵션 목록 */}
          <View style={themed($optionsContainer)}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  themed($optionButton),
                  index === options.length - 1 && themed($lastOptionButton),
                ]}
                onPress={() => handleOptionPress(option)}
              >
                <View style={themed($optionContent)}>
                  {option.icon && (
                    <View style={themed($optionIcon)}>{option.icon}</View>
                  )}
                  <Text
                    style={[
                      themed($optionText),
                      option.style === "destructive" &&
                        themed($destructiveText),
                      option.style === "cancel" && themed($cancelText),
                    ]}
                  >
                    {option.text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- 스타일 정의 ---
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "flex-end",
});

const $backdrop: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 34, // Safe area 고려
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  position: "relative",
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "600",
  color: colors.text,
  textAlign: "center",
  marginBottom: 4,
});

const $message: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 20,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "absolute",
  top: spacing.md,
  right: spacing.md,
  padding: spacing.xs,
});

const $optionsContainer: ThemedStyle<ViewStyle> = () => ({
  paddingTop: 8,
});

const $optionButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $lastOptionButton: ThemedStyle<ViewStyle> = () => ({
  borderBottomWidth: 0,
});

const $optionContent: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
});

const $optionIcon: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
});

const $optionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.text,
  textAlign: "center",
});

const $destructiveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
});

const $cancelText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
});
