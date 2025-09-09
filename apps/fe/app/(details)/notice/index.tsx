import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  fetchMockNotices,
  NoticeSummary,
  NoticeImportance,
  NoticeCategory,
  NoticePage,
} from "@/lib/notice/types";

/**
 * 공지 목록 페이지
 * - 목업 데이터 기반 (향후 API 연동 시 fetch 로직 교체)
 * - 페이지네이션 (기본 10개 단위)
 * - 중요도 / 고정(pinned) / 배너(highlightBanner) 여부 시각화
 * - 아이템 클릭 → 상세 페이지 이동 (/ (details)/notice/[noticeId]) (추후 파일 추가 필요)
 *
 * TODO(추후):
 * - 검색 / 필터 (카테고리, 중요도)
 * - 읽음 상태 관리 (사용자별)
 * - 서버 연동 (GraphQL 또는 REST)
 */

const PAGE_SIZE = 10;

export default function NoticeListScreen() {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  // 상태 정의
  const [items, setItems] = useState<NoticeSummary[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageInfo, setPageInfo] = useState<NoticePage["pageInfo"] | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 날짜 표시 포맷 (간단)
   */
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  };

  /**
   * 중요도 → 색상/라벨 매핑
   */
  const getImportanceMeta = (
    imp: NoticeImportance,
  ): { label: string; color: string } => {
    switch (imp) {
      case NoticeImportance.CRITICAL:
        return { label: "긴급", color: theme.colors.error ?? "#EF4444" };
      case NoticeImportance.HIGH:
        return { label: "중요", color: theme.colors.tint };
      case NoticeImportance.NORMAL:
        return { label: "안내", color: theme.colors.textDim };
      case NoticeImportance.LOW:
      default:
        return { label: "기타", color: theme.colors.border };
    }
  };

  /**
   * 카테고리 → 라벨
   */
  const categoryLabel = (c: NoticeCategory): string => {
    switch (c) {
      case NoticeCategory.GENERAL:
        return "일반";
      case NoticeCategory.FEATURE:
        return "기능";
      case NoticeCategory.EVENT:
        return "이벤트";
      case NoticeCategory.MAINTENANCE:
        return "점검";
      case NoticeCategory.POLICY:
        return "정책";
      default:
        return c;
    }
  };

  /**
   * 공지 목록 로드 (공통)
   */
  const loadPage = useCallback(async (targetPage: number, replace: boolean) => {
    try {
      if (targetPage === 1) {
        setError(null);
        setInitialLoading(true);
      }
      const res = fetchMockNotices(targetPage, PAGE_SIZE, {
        order: "PINNED_FIRST",
        activeOnly: false,
      });
      if (replace) {
        setItems(res.items);
      } else {
        setItems((prev) => [...prev, ...res.items]);
      }
      setPageInfo(res.pageInfo);
      setPage(targetPage);
    } catch (e: any) {
      setError(e?.message || "공지 목록을 불러오지 못했습니다.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  /**
   * 초기 로드
   */
  useEffect(() => {
    loadPage(1, true);
  }, [loadPage]);

  /**
   * 당겨서 새로고침
   */
  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    loadPage(1, true);
  };

  /**
   * 더 불러오기
   */
  const handleLoadMore = () => {
    if (
      loadingMore ||
      refreshing ||
      initialLoading ||
      !pageInfo ||
      !pageInfo.hasNext
    )
      return;
    setLoadingMore(true);
    loadPage(page + 1, false);
  };

  /**
   * 아이템 클릭 → 상세 페이지 이동
   */
  const handlePressItem = (notice: NoticeSummary) => {
    // 추후 / (details)/notice/[noticeId].tsx 파일 생성 필요
    router.push({
      pathname: "/(details)/notice/[noticeId]",
      params: { noticeId: notice.id },
    });
  };

  /**
   * 헤더 뒤로가기
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * 렌더 - 공지 아이템
   */
  const renderItem = ({ item }: { item: NoticeSummary }) => {
    const impMeta = getImportanceMeta(item.importance);
    return (
      <TouchableOpacity
        style={themed($itemContainer)}
        activeOpacity={0.75}
        onPress={() => handlePressItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`공지 ${item.title}`}
      >
        <View style={themed($itemLeft)}>
          <View
            style={[
              themed($importanceBadge),
              {
                backgroundColor: impMeta.color + "22",
                borderColor: impMeta.color,
              },
            ]}
          >
            <Text
              style={[themed($importanceText), { color: impMeta.color }]}
              numberOfLines={1}
            >
              {impMeta.label}
            </Text>
          </View>

          <Text style={themed($itemTitle)} numberOfLines={1}>
            {item.title}
          </Text>

          {item.pinned && (
            <Ionicons
              name="pin"
              size={14}
              color={theme.colors.tint}
              style={{ marginLeft: 4 }}
            />
          )}

          {item.highlightBanner && (
            <Ionicons
              name="megaphone-outline"
              size={14}
              color={theme.colors.tint}
              style={{ marginLeft: 2 }}
            />
          )}
        </View>

        <View style={themed($itemMetaRow)}>
          <Text style={themed($metaCategory)}>
            {categoryLabel(item.category)}
          </Text>
          <Text style={themed($metaDot)}>•</Text>
          <Text style={themed($metaDate)}>{formatDate(item.createdAt)}</Text>
        </View>

        <Text style={themed($itemPreview)} numberOfLines={2}>
          {item.previewText}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * 빈 상태
   */
  const listEmpty = () => {
    if (initialLoading) {
      return (
        <View style={themed($emptyContainer)}>
          <ActivityIndicator color={theme.colors.tint} />
          <Text style={themed($emptyText)}>불러오는 중...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={themed($emptyContainer)}>
          <Text style={themed($errorText)}>{error}</Text>
          <TouchableOpacity
            style={themed($retryButton)}
            onPress={() => loadPage(1, true)}
          >
            <Text style={themed($retryButtonText)}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={themed($emptyContainer)}>
        <Text style={themed($emptyText)}>등록된 공지가 없습니다.</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={handleBack}
          style={themed($backButton)}
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)}>공지사항</Text>
        <View style={themed($headerRightPlaceholder)} />
      </View>

      {/* 목록 */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={
          items.length === 0 ? undefined : themed($listContent)
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.tint}
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={themed($footerLoading)}>
              <ActivityIndicator size="small" color={theme.colors.tint} />
              <Text style={themed($footerLoadingText)}>불러오는 중...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

// ---------------- Styles ----------------

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
  backgroundColor: colors.background,
});

const $backButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
  marginRight: spacing.sm,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  textAlign: "center",
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
  marginRight: 24, // 뒤로가기 아이콘 영역 상쇄
});

const $headerRightPlaceholder: ThemedStyle<ViewStyle> = () => ({
  width: 24,
  height: 24,
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
  paddingBottom: spacing.lg,
});

const $itemContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $itemLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.xxs,
});

const $importanceBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderWidth: 1,
  borderRadius: 6,
  paddingHorizontal: spacing.xs,
  paddingVertical: 2,
  marginRight: spacing.xs,
  backgroundColor: colors.backgroundAlt,
});

const $importanceText: ThemedStyle<TextStyle> = () => ({
  fontSize: 11,
  fontWeight: "700",
});

const $itemTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "700",
  color: colors.text,
  flexShrink: 1,
});

const $itemMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.xxs,
  gap: 4,
});

const $metaCategory: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "600",
  color: colors.textDim,
});

const $metaDot: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
  marginHorizontal: 2,
});

const $metaDate: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
});

const $itemPreview: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  lineHeight: 16,
});

const $emptyContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.lg,
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.sm,
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.error ?? "#EF4444",
  fontWeight: "600",
  textAlign: "center",
  lineHeight: 18,
});

const $retryButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.xs,
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $retryButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "700",
});

const $footerLoading: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.md,
  gap: spacing.xs,
});

const $footerLoadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
});
/**
 * 커밋 요약:
 * - 공지 목록 페이지(목업 데이터 기반) 추가
 * - 페이지네이션/새로고침/중요도/카테고리 UI 구성
 * - 상세 페이지 이동 라우팅 준비
 *
 * commit: feat(notice): 공지 목록 페이지 추가 및 목업 페이지네이션 구현
 */
