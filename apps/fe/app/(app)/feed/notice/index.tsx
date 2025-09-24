/**
 * 피드 탭 내 공지 목록 화면
 * iOS 뒤로가기 제스처를 지원합니다
 */
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { fetchLatestNotices } from "@/lib/notice/api";
import type { Notice } from "@/lib/notice/types";
import { Ionicons } from "@expo/vector-icons";

export default function FeedNoticeListScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNotices = async () => {
      try {
        setLoading(true);
        const noticeList = await fetchLatestNotices({ limit: 20, activeOnly: true });
        setNotices(Array.isArray(noticeList) ? noticeList : []);
      } catch (err) {
        console.error("공지 목록 로드 실패:", err);
        setError("공지 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    loadNotices();
  }, []);

  const handleNoticePress = (noticeId: string) => {
    router.push({
      pathname: "/feed/notice/[noticeId]",
      params: { noticeId },
    });
  };

  const renderNoticeItem = ({ item }: { item: Notice }) => (
    <TouchableOpacity
      style={themed($noticeItem)}
      onPress={() => handleNoticePress(item.id)}
      activeOpacity={0.7}
    >
      <View style={themed($noticeContent)}>
        <View style={themed($noticeHeader)}>
          <Text style={themed($noticeTitle)} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isImportant && (
            <View style={themed($importantBadge)}>
              <Text style={themed($importantText)}>중요</Text>
            </View>
          )}
        </View>
        <Text style={themed($noticeDate)}>
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textDim} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" color={theme.colors.tint} />
        <Text style={themed($loadingText)}>공지사항을 불러오는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={themed($errorContainer)}>
        <Text style={themed($errorText)}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={themed($container)}>
      <View style={themed($header)}>
        <Text style={themed($title)}>공지사항</Text>
      </View>
      {notices.length > 0 ? (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderNoticeItem}
          contentContainerStyle={themed($listContainer)}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={themed($emptyContainer)}>
          <Text style={themed($emptyText)}>표시할 공지사항이 없습니다.</Text>
        </View>
      )}
    </View>
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
});

const $listContainer: ThemedStyle<any> = ({ spacing }) => ({
  padding: spacing.md,
});

const $noticeItem: ThemedStyle<any> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  padding: spacing.md,
  marginBottom: spacing.xs,
  backgroundColor: colors.backgroundAlt,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $noticeContent: ThemedStyle<any> = ({ spacing }) => ({
  flex: 1,
  marginRight: spacing.md,
});

const $noticeHeader: ThemedStyle<any> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: spacing.xxs,
});

const $noticeTitle: ThemedStyle<any> = ({ colors }) => ({
  flex: 1,
  fontSize: 16,
  fontWeight: "600",
  color: colors.text,
  marginRight: 8,
});

const $importantBadge: ThemedStyle<any> = ({ colors }) => ({
  backgroundColor: colors.error || "#ff4444",
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 8,
});

const $importantText: ThemedStyle<any> = () => ({
  color: "white",
  fontSize: 11,
  fontWeight: "bold",
});

const $noticeDate: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});

const $emptyContainer: ThemedStyle<any> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.xl,
});

const $emptyText: ThemedStyle<any> = ({ colors }) => ({
  fontSize: 16,
  color: colors.textDim,
  textAlign: "center",
});
