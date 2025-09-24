/**
 * 피드 탭 내 공지 상세 화면
 * iOS 뒤로가기 제스처를 지원합니다
 */
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { fetchNoticeById } from "@/lib/notice/api";
import type { Notice } from "@/lib/notice/types";

export default function FeedNoticeDetailScreen() {
  const { noticeId } = useLocalSearchParams<{ noticeId: string }>();
  const { themed, theme } = useAppTheme();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotice = async () => {
      if (!noticeId) {
        setError("공지 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const noticeData = await fetchNoticeById(noticeId);
        setNotice(noticeData);
      } catch (err) {
        console.error("공지 로드 실패:", err);
        setError("공지를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadNotice();
  }, [noticeId]);

  if (loading) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>공지를 불러오는 중...</Text>
      </View>
    );
  }

  if (error || !notice) {
    return (
      <View style={themed($errorContainer)}>
        <Text style={themed($errorText)}>{error || "공지를 찾을 수 없습니다."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={themed($container)}>
      <View style={themed($header)}>
        <Text style={themed($title)}>{notice.title}</Text>
        {__DEV__ && (
          <Text style={themed($noticeId)}>ID: {noticeId}</Text>
        )}
      </View>
      <View style={themed($content)}>
        <View style={themed($metaInfo)}>
          <Text style={themed($date)}>
            {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
          </Text>
          {notice.isImportant && (
            <View style={themed($importantBadge)}>
              <Text style={themed($importantText)}>중요</Text>
            </View>
          )}
        </View>
        {notice.content && (
          <Text style={themed($contentText)}>{notice.content}</Text>
        )}
        <View style={themed($gestureInfo)}>
          <Text style={themed($gestureText)}>
            ← iOS에서는 화면 왼쪽 가장자리에서 오른쪽으로 스와이프하여 뒤로 갈 수 있습니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const $container: ThemedStyle<any> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $loadingContainer: ThemedStyle<any> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
});

const $loadingText: ThemedStyle<any> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  fontSize: 16,
  color: colors.text,
});

const $errorContainer: ThemedStyle<any> = ({ colors }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
  padding: 20,
});

const $errorText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 16,
  color: colors.error || colors.text,
  textAlign: "center",
});

const $header: ThemedStyle<any> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.lg,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.backgroundAlt,
});

const $title: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: 4,
});

const $noticeId: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $content: ThemedStyle<any> = ({ spacing }) => ({
  padding: spacing.md,
});

const $metaInfo: ThemedStyle<any> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.md,
});

const $date: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $importantBadge: ThemedStyle<any> = ({ colors }) => ({
  backgroundColor: colors.error || "#ff4444",
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
});

const $importantText: ThemedStyle<any> = () => ({
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
});

const $contentText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 16,
  color: colors.text,
  lineHeight: 24,
  marginBottom: 20,
});

const $gestureInfo: ThemedStyle<any> = ({ colors, spacing }) => ({
  marginTop: spacing.lg,
  padding: spacing.md,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $gestureText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  fontStyle: "italic",
  textAlign: "center",
});
