import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  ViewStyle,
  TextStyle,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import {
  NOTICE_MOCKS,
  Notice,
  NoticeImportance,
  NoticeCategory,
  buildPreviewText,
  isActive,
  getLifecycleStatus,
} from "@/lib/notice/types";

/**
 * 공지 상세 페이지
 * - 목업 데이터 기반 (추후 API 연동 시 단건 fetch 로직 교체)
 * - 중요도/카테고리/상태(예정/비공개/만료) 시각적 구분
 * - 공유 기능(간단한 Share API)
 * - 에러/로딩/미존재 처리
 *
 * 향후 확장 포인트:
 * 1) 서버 연동: noticeId 기반 GraphQL Query (필요 시 suspense cache)
 * 2) 마크다운 지원: contentType === MARKDOWN 일 경우 react-native-markdown-display 적용
 * 3) 읽음 처리: 서버에 readAt 전송 (사용자별 히스토리)
 * 4) 첨부파일/이미지/링크 embed 등
 */

export default function NoticeDetailScreen() {
  const { noticeId } = useLocalSearchParams<{ noticeId: string }>();
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 간단한 목업 단건 조회
   * - 실제 API 연동 시: try/catch + 네트워크/HTTP 에러 처리 + 재시도 로직
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        if (!noticeId) {
          setError("잘못된 접근입니다 (noticeId 없음).");
          return;
        }
        // 목업에서 검색
        const found = NOTICE_MOCKS.find((n) => n.id === noticeId) || null;
        if (!found) {
          setError("해당 공지를 찾을 수 없습니다.");
          return;
        }
        if (mounted) setNotice(found);
      } catch (e: any) {
        if (mounted)
          setError(e?.message || "공지 로드 중 오류가 발생했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [noticeId]);

  /**
   * 중요도 메타데이터 (색상, 라벨)
   */
  const importanceMeta = useMemo(() => {
    if (!notice) return null;
    switch (notice.importance) {
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
  }, [notice, theme.colors]);

  /**
   * 카테고리 라벨
   */
  const categoryLabel = useCallback((c: NoticeCategory): string => {
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
  }, []);

  /**
   * 날짜 포맷
   */
  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getFullYear()}.${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
  };

  /**
   * 라이프사이클 상태 라벨
   */
  const lifecycleLabel = useMemo(() => {
    if (!notice) return null;
    const status = getLifecycleStatus(notice);
    switch (status) {
      case "draft":
        return "비공개";
      case "scheduled":
        return "예정";
      case "expired":
        return "만료";
      case "active":
      default:
        return null; // active 는 일반적으로 표기 생략
    }
  }, [notice]);

  /**
   * 공유 (간단)
   */
  const handleShare = async () => {
    if (!notice) return;
    try {
      await Share.share({
        title: notice.title,
        message: `[공지] ${notice.title}\n\n${buildPreviewText(notice, 140)}\n\n(앱에서 계속 보기)`,
      });
    } catch (e) {
      Alert.alert("공유 실패", "공유 중 문제가 발생했습니다.");
    }
  };

  /**
   * 뒤로가기
   */
  const handleBack = () => {
    router.back();
  };

  /**
   * 활성 여부 + 표시 상태
   */
  const active = notice ? isActive(notice) : false;

  return (
    <View style={themed($container)}>
      {/* 헤더 */}
      <View style={themed($header)}>
        <TouchableOpacity
          onPress={handleBack}
          style={themed($headerIconBtn)}
          accessibilityLabel="뒤로가기"
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={themed($headerTitle)} numberOfLines={1}>
          공지 상세
        </Text>
        <View style={themed($headerRight)}>
          {notice && (
            <TouchableOpacity
              onPress={handleShare}
              style={themed($headerIconBtn)}
              accessibilityLabel="공유"
            >
              <Ionicons
                name="share-social-outline"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 본문 */}
      {loading && (
        <View style={themed($centerFill)}>
          <ActivityIndicator color={theme.colors.tint} />
          <Text style={themed($loadingText)}>불러오는 중...</Text>
        </View>
      )}

      {!loading && error && (
        <View style={themed($centerFill)}>
          <Text style={themed($errorText)}>{error}</Text>
          <TouchableOpacity
            onPress={handleBack}
            style={themed($backButtonInline)}
            accessibilityLabel="뒤로가기"
          >
            <Text style={themed($backButtonInlineText)}>뒤로가기</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && notice && (
        <ScrollView
          style={themed($scroll)}
          contentContainerStyle={themed($scrollContent)}
        >
          {/* 상단 메타 섹션 */}
          <View style={themed($metaRowWrap)}>
            {/* 중요도 배지 */}
            {importanceMeta && (
              <View
                style={[
                  themed($importanceBadge),
                  {
                    backgroundColor: importanceMeta.color + "22",
                    borderColor: importanceMeta.color,
                  },
                ]}
              >
                <Text
                  style={[
                    themed($importanceBadgeText),
                    { color: importanceMeta.color },
                  ]}
                >
                  {importanceMeta.label}
                </Text>
              </View>
            )}

            {/* 카테고리 */}
            <View style={themed($categoryBadge)}>
              <Text style={themed($categoryText)}>
                {categoryLabel(notice.category)}
              </Text>
            </View>

            {/* 상태 (예정/만료/비공개) */}
            {lifecycleLabel && (
              <View style={themed($statusBadge)}>
                <Text style={themed($statusText)}>{lifecycleLabel}</Text>
              </View>
            )}

            {/* 고정/배너 아이콘 */}
            {notice.pinned && (
              <Ionicons
                name="pin"
                size={16}
                color={theme.colors.tint}
                style={themed($metaIcon)}
              />
            )}
            {notice.highlightBanner && (
              <Ionicons
                name="megaphone-outline"
                size={16}
                color={theme.colors.tint}
                style={themed($metaIcon)}
              />
            )}
          </View>

          {/* 제목 */}
          <Text style={themed($title)}>{notice.title}</Text>

          {/* 부가 정보 (작성일 / 노출 기간) */}
          <View style={themed($subMetaRow)}>
            <Text style={themed($dateText)}>
              작성일 {formatDate(notice.createdAt)}
            </Text>
            {notice.startAt && (
              <Text style={themed($dateText)}>
                {" • 시작 " + formatDate(notice.startAt)}
              </Text>
            )}
            {notice.endAt && (
              <Text style={themed($dateText)}>
                {" • 종료 " + formatDate(notice.endAt)}
              </Text>
            )}
          </View>

          {!active && lifecycleLabel === "만료" && (
            <Text style={themed($expiredInfo)}>
              이 공지는 만료되어 현재는 노출 기간이 아닙니다.
            </Text>
          )}
          {!active && lifecycleLabel === "예정" && (
            <Text style={themed($scheduledInfo)}>
              이 공지는 아직 시작 전이며 사전 열람 중입니다.
            </Text>
          )}
          {!active && lifecycleLabel === "비공개" && (
            <Text style={themed($draftInfo)}>
              비공개(Draft) 상태입니다. 운영자 외 노출되지 않습니다.
            </Text>
          )}

          {/* 본문 (간단 렌더 - 줄바꿈 처리) */}
          <View style={themed($contentBox)}>
            {notice.content.split(/\n{2,}/).map((chunk, idx) => (
              <Text key={idx} style={themed($contentParagraph)}>
                {chunk.trim()}
              </Text>
            ))}
          </View>

          {/* 태그 */}
          {notice.tags && notice.tags.length > 0 && (
            <View style={themed($tagsRow)}>
              {notice.tags.map((tag) => (
                <View key={tag} style={themed($tagChip)}>
                  <Text style={themed($tagText)}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={themed($allNoticesButton)}
            onPress={() => router.push("/(details)/notice")}
            accessibilityRole="button"
            accessibilityLabel="공지 전체 목록 보기"
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={16} color="#fff" />
            <Text style={themed($allNoticesButtonText)}>공지 전체보기</Text>
          </TouchableOpacity>

          <View style={themed($bottomSpace)} />
        </ScrollView>
      )}
    </View>
  );
}

// -------------------- 스타일 정의 --------------------

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
});

const $headerIconBtn: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $headerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  textAlign: "center",
  fontSize: 17,
  fontWeight: "700",
  color: colors.text,
});

const $headerRight: ThemedStyle<ViewStyle> = () => ({
  width: 40,
  alignItems: "flex-end",
});

const $centerFill: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
  padding: 24,
  gap: 12,
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
  fontWeight: "500",
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error ?? "#EF4444",
  fontSize: 14,
  fontWeight: "600",
  textAlign: "center",
  lineHeight: 20,
});

const $backButtonInline: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 8,
});

const $backButtonInlineText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "700",
});

const $scroll: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $scrollContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  paddingBottom: spacing.xl,
});

const $metaRowWrap: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.xs,
});

const $importanceBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  borderWidth: 1,
  paddingHorizontal: spacing.sm,
  paddingVertical: 2,
  borderRadius: 6,
  backgroundColor: colors.backgroundAlt,
});

const $importanceBadgeText: ThemedStyle<TextStyle> = () => ({
  fontSize: 11,
  fontWeight: "700",
});

const $categoryBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.sm,
  paddingVertical: 2,
  borderRadius: 6,
});

const $categoryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "600",
  color: colors.textDim,
});

const $statusBadge: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.error ? colors.error + "22" : "rgba(239,68,68,0.15)",
  paddingHorizontal: spacing.sm,
  paddingVertical: 2,
  borderRadius: 6,
});

const $statusText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "700",
  color: colors.error ?? "#EF4444",
});

const $metaIcon: ThemedStyle<TextStyle> = () => ({
  marginLeft: 2,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "800",
  color: colors.text,
  lineHeight: 28,
  marginBottom: 6,
});

const $subMetaRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: spacing.xs,
  marginBottom: spacing.sm,
});

const $dateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "500",
  color: colors.textDim,
});

const $expiredInfo: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error ? colors.error + "15" : "rgba(239,68,68,0.10)",
  color: colors.error ?? "#EF4444",
  fontSize: 12,
  fontWeight: "600",
  paddingVertical: 6,
  paddingHorizontal: spacing.sm,
  borderRadius: 6,
  marginBottom: spacing.sm,
});

const $scheduledInfo: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint + "15",
  color: colors.tint,
  fontSize: 12,
  fontWeight: "600",
  paddingVertical: 6,
  paddingHorizontal: spacing.sm,
  borderRadius: 6,
  marginBottom: spacing.sm,
});

const $draftInfo: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  color: colors.textDim,
  fontSize: 12,
  fontWeight: "600",
  paddingVertical: 6,
  paddingHorizontal: spacing.sm,
  borderRadius: 6,
  marginBottom: spacing.sm,
});

const $contentBox: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
  marginBottom: spacing.md,
  gap: spacing.sm,
});

const $contentParagraph: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  lineHeight: 22,
  color: colors.text,
  fontWeight: "400",
});

const $tagsRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginTop: spacing.xs,
});

const $tagChip: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.backgroundAlt,
  paddingHorizontal: spacing.sm,
  paddingVertical: 4,
  borderRadius: 14,
});

const $tagText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  fontWeight: "600",
  color: colors.textDim,
});

/**
 * 공지 전체보기 버튼 스타일
 * - 피드 이동과 구분되는 명확한 Call-To-Action
 */
const $allNoticesButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.tint,
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  marginTop: spacing.md,
  gap: spacing.xs,
});

const $allNoticesButtonText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 14,
  fontWeight: "700",
});

const $bottomSpace: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  height: spacing.xl,
});

/**
 * 커밋 요약:
 * - 공지 상세 페이지 구현 (목업 데이터 기반)
 * - 중요도/카테고리/상태/태그/기간/공유/에러 처리 포함
 * - 태그 아래 '공지 전체보기' 버튼 추가 (공지 목록 화면 진입)
 * - 향후 서버 연동 및 마크다운 확장 가이드 주석 유지
 */
//
// commit: feat(notice): 공지 상세 페이지에 '공지 전체보기' 버튼 추가
