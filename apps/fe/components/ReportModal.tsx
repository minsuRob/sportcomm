import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useMutation } from "@apollo/client";
import { Ionicons } from "@expo/vector-icons";
import { CREATE_REPORT } from "@/lib/graphql";
import { showToast } from "@/components/CustomToast";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// 신고 유형 정의
export enum ReportType {
  SPAM = "SPAM",
  INAPPROPRIATE_CONTENT = "INAPPROPRIATE_CONTENT",
  HARASSMENT = "HARASSMENT",
  MISINFORMATION = "MISINFORMATION",
  COPYRIGHT = "COPYRIGHT",
  OTHER = "OTHER",
}

interface ReportOption {
  type: ReportType;
  label: string;
  description: string;
}

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  postId?: string;
  reportedUserId?: string;
  reportedUserName?: string;
  // 채팅 메시지 신고를 위한 추가 필드
  messageId?: string;
  messageContent?: string;
}

const reportOptions: ReportOption[] = [
  {
    type: ReportType.SPAM,
    label: "스팸",
    description: "반복적이거나 원치 않는 콘텐츠",
  },
  {
    type: ReportType.INAPPROPRIATE_CONTENT,
    label: "부적절한 콘텐츠",
    description: "폭력적이거나 성인 콘텐츠",
  },
  {
    type: ReportType.HARASSMENT,
    label: "괴롭힘",
    description: "다른 사용자를 괴롭히거나 위협하는 행위",
  },
  {
    type: ReportType.MISINFORMATION,
    label: "허위 정보",
    description: "거짓되거나 오해를 불러일으키는 정보",
  },
  {
    type: ReportType.COPYRIGHT,
    label: "저작권 침해",
    description: "무단으로 사용된 저작물",
  },
  {
    type: ReportType.OTHER,
    label: "기타",
    description: "위에 해당하지 않는 기타 문제",
  },
];

export default function ReportModal({
  visible,
  onClose,
  postId,
  reportedUserId,
  reportedUserName,
  messageId,
  messageContent,
}: ReportModalProps) {
  const { themed, theme } = useAppTheme();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [executeCreateReport] = useMutation(CREATE_REPORT);

  const handleSubmit = async () => {
    if (!selectedType) {
      showToast({
        type: "error",
        title: "신고 유형 선택",
        message: "신고 유형을 선택해주세요.",
        duration: 3000,
      });
      return;
    }

    if (reason.trim().length < 10) {
      showToast({
        type: "error",
        title: "신고 사유 입력",
        message: "신고 사유를 10자 이상 입력해주세요.",
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await executeCreateReport({
        variables: {
          input: {
            type: selectedType,
            reason: reason.trim(),
            postId,
            messageId,
            reportedUserId,
          },
        },
      });

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      showToast({
        type: "success",
        title: "신고 완료",
        message: "신고가 접수되었습니다. 검토 후 조치하겠습니다.",
        duration: 3000,
      });

      // 모달 닫기 및 상태 초기화
      handleClose();
    } catch (error) {
      console.error("신고 실패:", error);
      showToast({
        type: "error",
        title: "신고 실패",
        message:
          error instanceof Error
            ? error.message
            : "신고 처리 중 오류가 발생했습니다.",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setReason("");
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={themed($modalOverlay)}>
        <View style={themed($modalContent)}>
          {/* 헤더 */}
          <View style={themed($header)}>
            <Text style={themed($headerTitle)}>신고하기</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={themed($closeButton)}
            >
              <Ionicons name="close" color={theme.colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={themed($scrollContainer)}
            showsVerticalScrollIndicator={false}
          >
            {/* 신고 대상 정보 */}
            <View style={themed($targetInfo)}>
              <Text style={themed($targetInfoText)}>
                {postId
                  ? "게시물을 신고합니다"
                  : messageId
                    ? "채팅 메시지를 신고합니다"
                    : `${reportedUserName}님을 신고합니다`}
              </Text>
              {messageContent && (
                <Text style={themed($messagePreview)}>
                  "
                  {messageContent.length > 50
                    ? messageContent.substring(0, 50) + "..."
                    : messageContent}
                  "
                </Text>
              )}
            </View>

            {/* 신고 유형 선택 */}
            <View style={themed($section)}>
              <Text style={themed($sectionTitle)}>신고 유형</Text>
              {reportOptions.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    themed($optionItem),
                    {
                      borderColor:
                        selectedType === option.type
                          ? theme.colors.tint
                          : theme.colors.border,
                      backgroundColor:
                        selectedType === option.type
                          ? theme.colors.tint + "20"
                          : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedType(option.type)}
                >
                  <Text
                    style={[
                      themed($optionLabel),
                      {
                        color:
                          selectedType === option.type
                            ? theme.colors.tint
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={themed($optionDescription)}>
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 신고 사유 입력 */}
            <View style={themed($section)}>
              <Text style={themed($sectionTitle)}>상세 사유</Text>
              <TextInput
                style={themed($textInput)}
                placeholder="신고 사유를 자세히 설명해주세요 (최소 10자)"
                placeholderTextColor={theme.colors.textDim}
                value={reason}
                onChangeText={setReason}
                multiline
                textAlignVertical="top"
                maxLength={1000}
                editable={!isSubmitting}
              />
              <View style={themed($characterCount)}>
                <Text style={themed($characterCountText)}>
                  {reason.length}/1000
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* 하단 버튼 */}
          <View style={themed($footer)}>
            <TouchableOpacity
              style={themed($cancelButton)}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={themed($cancelButtonText)}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                themed($submitButton),
                {
                  opacity:
                    !selectedType || reason.trim().length < 10 || isSubmitting
                      ? 0.5
                      : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={
                !selectedType || reason.trim().length < 10 || isSubmitting
              }
            >
              <Text style={themed($submitButtonText)}>
                {isSubmitting ? "신고 중..." : "신고하기"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --- 스타일 정의 ---
const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "flex-end",
});

const $modalContent: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: "90%",
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
});

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $scrollContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $targetInfo: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  backgroundColor: colors.tint + "10",
  marginHorizontal: spacing.md,
  marginTop: spacing.md,
  borderRadius: 8,
});

const $targetInfoText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
  textAlign: "center",
});

const $messagePreview: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.textDim,
  textAlign: "center",
  marginTop: spacing.xs,
  fontStyle: "italic",
});

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginBottom: spacing.sm,
});

const $optionItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  borderWidth: 2,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginBottom: spacing.sm,
});

const $optionLabel: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
});

const $optionDescription: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: spacing.xs,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  minHeight: 100,
  fontSize: 16,
  color: colors.text,
  backgroundColor: colors.background,
  textAlignVertical: "top",
});

const $characterCount: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "flex-end",
  marginTop: spacing.sm,
});

const $characterCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
  gap: spacing.sm,
});

const $cancelButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
});

const $cancelButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
});

const $submitButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  borderRadius: 8,
  backgroundColor: colors.error,
  alignItems: "center",
});

const $submitButtonText: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  fontWeight: "600",
  color: "white",
});
