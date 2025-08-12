import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@apollo/client";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { CREATE_COMMENT } from "@/lib/graphql";
import { User } from "@/lib/auth";
import {
  triggerCommentNotification,
  shouldTriggerDevelopmentNotifications,
} from "@/lib/notifications/notificationTrigger";

// --- 타입 정의 ---
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
}

interface CommentSectionProps {
  postId: string;
  comments: Comment[] | null | undefined;
  currentUser: User | null;
  onCommentAdded?: () => void;
  postAuthorId?: string; // 게시물 작성자 ID (알림용)
}

/**
 * 댓글 섹션 컴포넌트
 * 댓글 목록 표시 및 새 댓글 작성 기능을 제공합니다
 */
export default function CommentSection({
  postId,
  comments,
  currentUser,
  onCommentAdded,
  postAuthorId,
}: CommentSectionProps) {
  const { themed, theme } = useAppTheme();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // comments가 null이나 undefined인 경우 빈 배열로 처리
  const safeComments = comments || [];

  const [executeCreateComment, { loading }] = useMutation(CREATE_COMMENT);

  /**
   * 댓글 작성 핸들러
   */
  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    const content = commentText.trim();
    setCommentText("");

    try {
      await executeCreateComment({
        variables: {
          input: {
            postId,
            content,
          },
        },
      });

      if (onCommentAdded) {
        onCommentAdded();
      }

      if (
        shouldTriggerDevelopmentNotifications() &&
        currentUser &&
        postAuthorId &&
        currentUser.id !== postAuthorId
      ) {
        triggerCommentNotification(currentUser.nickname, content);
      }
    } catch (error) {
      console.error("댓글 작성 처리 중 예외 발생:", error);
      // 에러 발생 시 사용자에게 피드백을 주는 로직 추가 가능
    } finally {
      setIsSubmitting(false);
    }
  }, [
    commentText,
    currentUser,
    isSubmitting,
    postId,
    postAuthorId,
    onCommentAdded,
    executeCreateComment,
  ]);

  return (
    <KeyboardAwareScrollView
      style={themed($container)}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* 댓글 제목 */}
          <Text style={themed($title)}>댓글 {safeComments.length}개</Text>

          {/* 댓글 목록 */}
          {safeComments.length > 0 ? (
            safeComments.map((comment) => (
              <View key={comment.id} style={themed($commentItem)}>
                <Image
                  source={{
                    uri:
                      comment.author.profileImageUrl ||
                      `https://i.pravatar.cc/150?u=${comment.author.id}`,
                  }}
                  style={themed($commentAvatar)}
                />
                <View style={themed($commentContent)}>
                  <View style={themed($commentHeader)}>
                    <Text style={themed($commentAuthor)}>
                      {comment.author.nickname}
                    </Text>
                    <Text style={themed($commentDate)}>
                      {new Date(comment.createdAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={themed($commentText)}>{comment.content}</Text>
                </View>
              </View>
            ))
          ) : (
            /* 댓글이 없을 때 */
            <View style={themed($emptyState)}>
              <Text style={themed($emptyText)}>
                아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
              </Text>
            </View>
          )}

          {/* 로그인하지 않은 사용자를 위한 안내 */}
          {!currentUser && (
            <View style={themed($loginPrompt)}>
              <Text style={themed($loginPromptText)}>
                댓글을 작성하려면 로그인이 필요합니다.
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* 댓글 입력 영역 (KeyboardAwareScrollView 외부에 배치하여 키보드와 함께 올라오도록 함) */}
      {currentUser && (
        <View style={themed($inputSection)}>
          <Image
            source={{
              uri:
                currentUser.profileImageUrl ||
                `https://i.pravatar.cc/150?u=${currentUser.id}`,
            }}
            style={themed($inputAvatar)}
          />
          <TextInput
            style={themed($textInput)}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor={theme.colors.textDim}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!isSubmitting}
            returnKeyType="send"
            onSubmitEditing={handleSubmitComment}
          />
          <TouchableOpacity
            style={[
              themed($sendButton),
              { opacity: commentText.trim() && !isSubmitting ? 1 : 0.5 },
            ]}
            onPress={handleSubmitComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            <Ionicons name="send" color={theme.colors.tint} size={20} />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAwareScrollView>
  );
}

// --- 스타일 정의 ---
const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.xl,
});

const $title: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.lg,
});

const $commentItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginBottom: spacing.lg,
});

const $commentAvatar: ThemedStyle<ImageStyle> = () => ({
  width: 40,
  height: 40,
  borderRadius: 20,
});

const $commentContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
});

const $commentHeader: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const $commentAuthor: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "600",
  color: colors.text,
});

const $commentDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $commentText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.text,
  marginTop: spacing.xs,
  lineHeight: 20,
});

const $emptyState: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.xl,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
});

const $inputSection: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-end",
  marginTop: spacing.lg,
  paddingTop: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $inputAvatar: ThemedStyle<ImageStyle> = () => ({
  width: 36,
  height: 36,
  borderRadius: 18,
});

const $textInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginHorizontal: spacing.sm,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.sm,
  backgroundColor: colors.separator,
  borderRadius: 20,
  fontSize: 16,
  color: colors.text,
  maxHeight: 100,
  minHeight: 40,
});

const $sendButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.sm,
});

const $loginPrompt: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  alignItems: "center",
  paddingVertical: spacing.lg,
  marginTop: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.border,
});

const $loginPromptText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  textAlign: "center",
});
