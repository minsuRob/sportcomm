import React, { useCallback, useEffect, useState } from "react"; // GraphQL notices migrated
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
  TextInput,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth/context/AuthContext";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import { useQuery, useMutation } from "@apollo/client";
import {
  GET_NOTICES,
  Notice as NoticeGql,
  CREATE_NOTICE,
  DELETE_NOTICE,
} from "@/lib/graphql/notices";
import AppDialog from "@/components/ui/AppDialog";
// 로컬 enum 대신 GraphQL 응답 문자열을 직접 사용 (타입 충돌 제거)

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
  const [items, setItems] = useState<NoticeGql[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageInfo, setPageInfo] = useState<{ hasNext: boolean } | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ADMIN 전용: 글쓰기 모달/입력 상태 (사용자: AuthContext 경유)
  const { user: currentUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [nTitle, setNTitle] = useState<string>("");
  const [nContent, setNContent] = useState<string>("");
  const [nCategory, setNCategory] = useState<NoticeGql["category"]>("GENERAL");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 삭제 관련 상태
  const [deleteDialogVisible, setDeleteDialogVisible] =
    useState<boolean>(false);
  const [noticeToDelete, setNoticeToDelete] = useState<NoticeGql | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // (제거됨) 개별 getSession 호출: AuthProvider 가 전역 부트스트랩 수행
  // currentUser 는 useAuth() 에서 직접 제공

  const isAdmin = !!(
    currentUser?.role === "ADMIN" || (currentUser as any)?.isAdmin
  );

  // 공지 생성 Mutation
  const [createNotice] = useMutation(CREATE_NOTICE);

  // 공지 삭제 Mutation
  const [deleteNotice] = useMutation(DELETE_NOTICE);

  // GraphQL 공지 목록 Query (1페이지)
  const {
    data,
    loading: queryLoading,
    error: queryError,
    fetchMore,
    refetch,
  } = useQuery(GET_NOTICES, {
    variables: {
      input: {
        page: 1,
        limit: PAGE_SIZE,
        pinnedFirst: true,
        activeOnly: false,
      },
    },
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "cache-first",
  });

  // 서버 에러 동기화
  useEffect(() => {
    if (queryError) setError(queryError.message);
  }, [queryError]);

  // 최초/리패치 데이터 -> 상태 반영
  useEffect(() => {
    if (data?.notices && data.notices.page === 1) {
      setItems(data.notices.items);
      setPageInfo({ hasNext: data.notices.hasNext });
      setPage(1);
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [data]);

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
    imp: NoticeGql["importance"],
  ): { label: string; color: string } => {
    switch (imp) {
      case "CRITICAL":
        return { label: "긴급", color: theme.colors.error ?? "#EF4444" };
      case "HIGH":
        return { label: "중요", color: theme.colors.tint };
      case "NORMAL":
        return { label: "안내", color: theme.colors.textDim };
      case "LOW":
      default:
        return { label: "기타", color: theme.colors.border };
    }
  };

  /**
   * 카테고리 → 라벨
   */
  const categoryLabel = (c: NoticeGql["category"]): string => {
    switch (c) {
      case "GENERAL":
        return "일반";
      case "FEATURE":
        return "기능";
      case "EVENT":
        return "이벤트";
      case "MAINTENANCE":
        return "점검";
      case "POLICY":
        return "정책";
      default:
        return c;
    }
  };

  /**
   * 공지 목록 로드 (공통)
   */
  const loadPage = useCallback(
    async (targetPage: number, replace: boolean) => {
      if (targetPage === 1) {
        setError(null);
        setInitialLoading(true);
        try {
          const refreshed = await refetch({
            input: {
              page: 1,
              limit: PAGE_SIZE,
              pinnedFirst: true,
              activeOnly: false,
            },
          });
          const payload = refreshed.data?.notices;
          if (payload) {
            setItems(payload.items);
            setPageInfo({ hasNext: payload.hasNext });
            setPage(1);
          }
        } catch (e: any) {
          setError(e?.message || "공지 목록을 불러오지 못했습니다.");
        } finally {
          setInitialLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
        return;
      }
      if (loadingMore) return;
      setLoadingMore(true);
      try {
        const more = await fetchMore({
          variables: {
            input: {
              page: targetPage,
              limit: PAGE_SIZE,
              pinnedFirst: true,
              activeOnly: false,
            },
          },
        });
        const payload = more.data?.notices;
        if (payload) {
          setItems((prev) => [...prev, ...payload.items]);
          setPageInfo({ hasNext: payload.hasNext });
          setPage(targetPage);
        }
      } catch (e: any) {
        setError(e?.message || "추가 공지를 불러오지 못했습니다.");
      } finally {
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [fetchMore, refetch, loadingMore],
  );

  // ADMIN: 공지 생성 제출
  const handleSubmitCreateNotice = useCallback(async () => {
    if (!nTitle.trim() || !nContent.trim()) return;
    setSubmitting(true);
    try {
      await createNotice({
        variables: {
          input: {
            title: nTitle.trim(),
            content: nContent.trim(),
            category: nCategory,
          },
        },
      });
      // 입력 초기화 및 모달 닫기
      setNTitle("");
      setNContent("");
      setShowCreateModal(false);
      // 목록 새로고침 (1페이지부터)
      await loadPage(1, true);
    } catch (e) {
      console.error("공지 생성 실패:", e);
    } finally {
      setSubmitting(false);
    }
  }, [nTitle, nContent, nCategory, createNotice, loadPage]);

  // ADMIN: 공지 삭제 처리
  const handleDeleteNotice = useCallback((notice: NoticeGql) => {
    setNoticeToDelete(notice);
    setDeleteDialogVisible(true);
  }, []);

  // 삭제 확인 처리
  const handleConfirmDelete = useCallback(async () => {
    if (!noticeToDelete) return;

    setDeleting(true);
    try {
      await deleteNotice({
        variables: { id: noticeToDelete.id },
      });

      // 목록에서 삭제된 항목 제거
      setItems((prev) => prev.filter((item) => item.id !== noticeToDelete.id));

      // 다이얼로그 닫기
      setDeleteDialogVisible(false);
      setNoticeToDelete(null);
    } catch (e) {
      console.error("공지 삭제 실패:", e);
    } finally {
      setDeleting(false);
    }
  }, [noticeToDelete, deleteNotice]);

  // 삭제 다이얼로그 닫기
  const handleCloseDeleteDialog = useCallback(() => {
    if (deleting) return; // 삭제 중일 때는 닫기 방지
    setDeleteDialogVisible(false);
    setNoticeToDelete(null);
  }, [deleting]);

  /**
   * 초기 로드
   */
  // 초기 로드는 useQuery 기본 호출로 대체 (필요 시 강제 refetch 로직 유지 가능)
  useEffect(() => {
    if (queryLoading && items.length === 0) {
      setInitialLoading(true);
    }
  }, [queryLoading, items.length]);

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
  const handlePressItem = (notice: NoticeGql) => {
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
  const renderItem = ({ item }: { item: NoticeGql }) => {
    const impMeta = getImportanceMeta(item.importance);
    return (
      <View style={themed($itemContainer)}>
        <TouchableOpacity
          style={themed($itemContent)}
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
            {item.content.replace(/\s+/g, " ").trim().slice(0, 110)}
          </Text>
        </TouchableOpacity>

        {/* ADMIN 전용 삭제 버튼 */}
        {isAdmin && (
          <TouchableOpacity
            style={themed($deleteButton)}
            onPress={() => handleDeleteNotice(item)}
            accessibilityRole="button"
            accessibilityLabel={`공지 ${item.title} 삭제`}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.error}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * 빈 상태
   */
  const listEmpty = () => {
    if (initialLoading || queryLoading) {
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
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={themed($writeButton)}
            accessibilityLabel="공지 글쓰기"
            accessibilityRole="button"
          >
            <Ionicons name="create" size={16} color={theme.colors.tint} />
            <Text style={themed($writeButtonText)}>공지쓰기</Text>
          </TouchableOpacity>
        ) : (
          <View style={themed($headerRightPlaceholder)} />
        )}
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
      {/* ADMIN 전용: 공지 작성 모달 */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={themed($modalBackdrop)}>
          <View style={themed($modalSheet)}>
            <View style={themed($modalHeader)}>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={themed($modalIconButton)}
                accessibilityLabel="닫기"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={themed($modalTitle)}>공지 작성</Text>
              <TouchableOpacity
                onPress={handleSubmitCreateNotice}
                disabled={submitting || !nTitle.trim() || !nContent.trim()}
                style={[
                  themed($publishButtonSm),
                  {
                    opacity:
                      submitting || !nTitle.trim() || !nContent.trim()
                        ? 0.5
                        : 1,
                  },
                ]}
                accessibilityLabel="공지 게시"
                accessibilityRole="button"
              >
                <Ionicons name="paper-plane" size={16} color="white" />
                <Text style={themed($publishButtonSmText)}>
                  {submitting ? "게시 중..." : "게시"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={themed($modalBody)}>
              <Text style={themed($label)}>카테고리</Text>
              <View style={themed($categoryRow)}>
                {(
                  [
                    "GENERAL",
                    "FEATURE",
                    "EVENT",
                    "MAINTENANCE",
                    "POLICY",
                  ] as const
                ).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      themed($categoryPill),
                      nCategory === cat && themed($categoryPillActive),
                    ]}
                    onPress={() => setNCategory(cat)}
                  >
                    <Text style={themed($categoryPillText)}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={themed($label)}>제목</Text>
              <TextInput
                style={themed($input)}
                placeholder="공지 제목"
                placeholderTextColor={theme.colors.textDim}
                value={nTitle}
                onChangeText={setNTitle}
                editable={!submitting}
              />

              <Text style={themed($label)}>내용</Text>
              <TextInput
                style={[themed($input), themed($textarea)]}
                placeholder="공지 내용을 입력하세요"
                placeholderTextColor={theme.colors.textDim}
                value={nContent}
                onChangeText={setNContent}
                multiline
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 삭제 확인 다이얼로그 */}
      <AppDialog
        visible={deleteDialogVisible}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="공지사항 삭제"
        description={`"${noticeToDelete?.title || ""}"을(를) 정말 삭제하시겠습니까?\n\n삭제된 공지사항은 복구할 수 없습니다.`}
        confirmText={deleting ? "삭제 중..." : "삭제"}
        cancelText="취소"
        confirmDisabled={deleting}
        dismissOnBackdrop={!deleting}
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

const $writeButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.tint,
  borderRadius: 16,
  backgroundColor: colors.tint + "10",
  gap: spacing.xxxs,
});

const $writeButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.tint,
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xs,
  paddingBottom: spacing.lg,
});

const $itemContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $itemContent: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $deleteButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  padding: spacing.sm,
  marginLeft: spacing.xs,
  borderRadius: 8,
  backgroundColor: colors.error + "10",
  borderWidth: 1,
  borderColor: colors.error + "30",
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

// --- 모달/입력 스타일 ---
const $modalBackdrop: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "flex-end",
});

const $modalSheet: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingBottom: spacing.lg,
});

const $modalHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $modalTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  fontWeight: "700",
  color: colors.text,
});

const $modalIconButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $publishButtonSm: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  gap: spacing.xxxs,
});

const $publishButtonSmText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 13,
  fontWeight: "600",
  marginLeft: 4,
});

const $modalBody: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  gap: spacing.sm,
});

const $label: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "600",
  color: colors.textDim,
});

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.text,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 8,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  backgroundColor: colors.background,
});

const $textarea: ThemedStyle<TextStyle> = () => ({
  minHeight: 140,
  textAlignVertical: "top",
});

const $categoryRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
});

const $categoryPill: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 999,
  backgroundColor: colors.backgroundAlt,
});

const $categoryPillActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderColor: colors.tint,
  backgroundColor: colors.tint + "15",
});

const $categoryPillText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.text,
});
// Helper 함수들
function getImportanceMeta(importance: string) {
  switch (importance) {
    case "HIGH":
      return { label: "높음", color: "#FF4444" };
    case "MEDIUM":
      return { label: "보통", color: "#FF8800" };
    case "LOW":
      return { label: "낮음", color: "#00AA00" };
    default:
      return { label: "일반", color: "#666666" };
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case "GENERAL":
      return "일반";
    case "FEATURE":
      return "기능";
    case "EVENT":
      return "이벤트";
    case "MAINTENANCE":
      return "점검";
    case "POLICY":
      return "정책";
    default:
      return category;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "오늘";
  } else if (diffDays === 1) {
    return "어제";
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  }
}

/**
 * 커밋 요약:
 * - 공지 목록 페이지(목업 데이터 기반) 추가
 * - 페이지네이션/새로고침/중요도/카테고리 UI 구성
 * - 상세 페이지 이동 라우팅 준비
 * - ADMIN 권한 사용자용 삭제 버튼 및 AppDialog 확인 팝업 추가
 *
 * commit: feat(notice): 공지 목록 페이지 추가 및 ADMIN 삭제 기능 구현
 */
