import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@apollo/client";
import { GET_MY_POINT_TRANSACTIONS } from "@/lib/graphql";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

/* =========================================================
 * 타입 정의
 * ======================================================= */

/**
 * 서버에서 내려오는 포인트 트랜잭션 아이템 타입
 * (GraphQL 스키마 PointTransaction 과 동일 / 필요한 필드만 사용)
 */
export interface PointTransactionDTO {
  id: string;
  createdAt: string;
  amount: number; // 변동량 (양수=적립 / 음수=차감)
  balanceAfter: number; // 변동 후 잔액 스냅샷
  type: string;
  description?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  metadata?: any;
}

/**
 * 서버 페이지 응답
 */
interface PointTxPage {
  items: PointTransactionDTO[];
  limit: number;
  hasNext: boolean;
  nextCursor?: string | null;
}

/**
 * 모달 컴포넌트 Props
 */
export interface PointHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  /** 필터: 적립/차감/전체 외부 초기값 (optional) */
  initialMode?: "all" | "earn" | "spend";
  /** 모달 사용자화 타이틀 */
  title?: string;
  /** 초기 페이지 크기 (default 20) */
  pageSize?: number;
  /** 웹에서 center 레이아웃 고정 여부 (기본 true) */
  centered?: boolean;
}

/**
 * 내부 필터 상태
 */
type FilterMode = "all" | "earn" | "spend";

/* =========================================================
 * 헬퍼 함수
 * ======================================================= */

/**
 * 날짜/시간 포맷 (간단 구현)
 * - 추후 date-fns / dayjs 통합 가능
 */
function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
  } catch {
    return iso;
  }
}

/**
 * 트랜잭션 타입 → 한글 라벨 매핑 (필요 시 확장)
 */
const TYPE_LABEL: Record<string, string> = {
  ATTENDANCE: "출석",
  POST_CREATE: "게시글",
  COMMENT_CREATE: "댓글",
  CHAT_MESSAGE: "채팅",
  SHOP_PURCHASE: "상점구매",
  ADJUSTMENT: "조정",
};

/**
 * 타입 라벨 반환
 */
function getTypeLabel(type: string): string {
  return TYPE_LABEL[type] || type;
}

/* =========================================================
 * 메인 컴포넌트
 * ======================================================= */

const PointHistoryModal: React.FC<PointHistoryModalProps> = ({
  visible,
  onClose,
  initialMode = "all",
  title = "포인트 이력",
  pageSize = 20,
  centered = true,
}) => {
  const { themed, theme } = useAppTheme();

  // 필터 상태
  const [filterMode, setFilterMode] = useState<FilterMode>(initialMode);

  // 서버 페이지 누적 저장
  const [items, setItems] = useState<PointTransactionDTO[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [hasNext, setHasNext] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // 첫 로딩 / refetch 용 식별자
  const [refreshToken, setRefreshToken] = useState(0);

  // urql 대신 Apollo 사용 (프로젝트 패턴)
  const { loading, error, refetch } = useQuery<{
    getMyPointTransactions: PointTxPage;
  }>(GET_MY_POINT_TRANSACTIONS, {
    variables: buildQueryVariables(pageSize, null, filterMode),
    fetchPolicy: "network-only",
    skip: !visible,
  });

  /**
   * 쿼리 변수 생성 (필터 모드에 따라 isEarn/isSpend 세팅)
   */
  function buildQueryVariables(
    limit: number,
    cursorValue: string | null,
    mode: FilterMode,
  ) {
    return {
      limit,
      cursor: cursorValue,
      isEarn: mode === "earn" ? true : mode === "spend" ? undefined : undefined,
      isSpend:
        mode === "spend" ? true : mode === "earn" ? undefined : undefined,
      // NOTE: earn / spend 동시 true 로 보내면 서버에서 필터 해제 → 현재 모드는 단일만
    };
  }

  /**
   * 최초 로딩 / 필터 변경 시 데이터 초기화 & refetch
   */
  useEffect(() => {
    if (!visible) return;
    // 초기화
    setItems([]);
    setCursor(null);
    setHasNext(false);
    // refetch 실행
    refetch(buildQueryVariables(pageSize, null, filterMode)).then((res) => {
      if (res.data?.getMyPointTransactions) {
        const page = res.data.getMyPointTransactions;
        setItems(page.items);
        setCursor(page.nextCursor);
        setHasNext(page.hasNext);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, filterMode, pageSize, refreshToken]);

  /**
   * Apollo useQuery 의 초기 fetch 결과 반영
   * (가끔 refetch 이전 최초 호출 결과를 items 에 반영하도록)
   */
  useEffect(() => {
    if (!loading && !error && visible) {
      // refetch 전 초기 호출인 경우 items 비어있다면 채우기
      // 단, 이미 items 가 있다면 skip (중복 방지)
      // (refetch 가 비동기적으로 도착하는 순서를 안정화)
      // 여기서는 엄격한 조건 대신 간단히 비었을 때만 세팅
      // edge case: 중복 item merge 시 id 기반 filter
    }
  }, [loading, error, visible]);

  /**
   * 추가 페이지 로딩
   */
  const loadMore = useCallback(async () => {
    if (!hasNext || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await refetch(
        buildQueryVariables(pageSize, cursor, filterMode),
      );
      const page = res.data?.getMyPointTransactions;
      if (page) {
        // 중복 제거: 기존 id set
        const existing = new Set(items.map((i) => i.id));
        const merged = [...items];
        page.items.forEach((it) => {
          if (!existing.has(it.id)) merged.push(it);
        });
        setItems(merged);
        setHasNext(page.hasNext);
        setCursor(page.nextCursor);
      }
    } finally {
      setIsFetchingMore(false);
    }
  }, [cursor, filterMode, hasNext, isFetchingMore, items, pageSize, refetch]);

  /**
   * 새로 고침 (사용자 수동)
   */
  const handleManualRefresh = useCallback(() => {
    setRefreshToken((t) => t + 1);
  }, []);

  /**
   * 금액 스타일 (양수/음수)
   */
  const getAmountStyle = useCallback(
    (amount: number): TextStyle => {
      if (amount > 0) {
        return { color: theme.colors.tint, fontWeight: "700" };
      } else if (amount < 0) {
        // theme.colors.error 존재 여부 fallback
        const errorColor = (theme.colors as any).error || "#E54848";
        return { color: errorColor, fontWeight: "700" };
      }
      return { color: theme.colors.text };
    },
    [theme.colors],
  );

  /**
   * 액션 버튼 (필터 탭)
   */
  const FilterTabs = useMemo(() => {
    const tabs: { key: FilterMode; label: string }[] = [
      { key: "all", label: "전체" },
      { key: "earn", label: "적립" },
      { key: "spend", label: "차감" },
    ];
    return (
      <View style={themed($filterTabRow)}>
        {tabs.map((t) => {
          const active = filterMode === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                themed($filterTab),
                active && [
                  themed($filterTabActive),
                  { borderColor: theme.colors.tint },
                ],
              ]}
              onPress={() => {
                if (filterMode !== t.key) {
                  setFilterMode(t.key);
                }
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  themed($filterTabText),
                  active && { color: theme.colors.tint },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }, [filterMode, theme.colors.tint, themed]);

  /**
   * 리스트 아이템 렌더링
   */
  const renderItem = useCallback(
    ({ item }: { item: PointTransactionDTO }) => {
      const isEarn = item.amount > 0;
      const sign = item.amount > 0 ? "+" : "";
      return (
        <View style={themed($row)}>
          <View style={themed($rowLeft)}>
            <Text style={themed($typeBadge)} numberOfLines={1}>
              {getTypeLabel(item.type)}
            </Text>
            <Text style={themed($description)} numberOfLines={1}>
              {item.description || "-"}
            </Text>
            <Text style={themed($dateText)}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
          <View style={themed($rowRight)}>
            <Text style={[themed($amountText), getAmountStyle(item.amount)]}>
              {sign}
              {item.amount.toLocaleString()}P
            </Text>
            <Text style={themed($balanceText)}>
              잔여 {item.balanceAfter.toLocaleString()}P
            </Text>
            {item.referenceType && (
              <Text style={themed($refTypeText)}>
                {item.referenceType}
                {item.referenceId ? ` • ${item.referenceId}` : ""}
              </Text>
            )}
            {isEarn && <View style={themed($earnDot)} />}
            {!isEarn && <View style={themed($spendDot)} />}
          </View>
        </View>
      );
    },
    [getAmountStyle, themed],
  );

  const keyExtractor = useCallback((item: PointTransactionDTO) => item.id, []);

  /**
   * 빈 상태
   */
  const ListEmpty = useMemo(
    () => (
      <View style={themed($emptyBox)}>
        {loading ? (
          <ActivityIndicator color={theme.colors.tint} />
        ) : (
          <Text style={themed($emptyText)}>포인트 이력이 없습니다.</Text>
        )}
      </View>
    ),
    [loading, theme.colors.tint, themed],
  );

  /**
   * 로딩 푸터 (더보기)
   */
  const ListFooter = useMemo(() => {
    if (!hasNext) return <View style={{ height: 4 }} />;
    return (
      <View style={themed($footerBox)}>
        {isFetchingMore ? (
          <ActivityIndicator size="small" color={theme.colors.tint} />
        ) : (
          <TouchableOpacity
            style={themed($loadMoreBtn)}
            onPress={loadMore}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chevron-down"
              size={16}
              color={theme.colors.text}
              style={{ marginRight: 4 }}
            />
            <Text style={themed($loadMoreText)}>더 불러오기</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    hasNext,
    isFetchingMore,
    loadMore,
    theme.colors.text,
    theme.colors.tint,
    themed,
  ]);

  // 가시성 변경 시 뒤 스크롤 제어 등 후처리 가능 (현재 생략)
  const overlayPressClose = useCallback(() => {
    // 바깥 영역 탭 시 닫기 (웹/모바일 공통)
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={themed($overlay)}
        onPress={overlayPressClose}
        accessibilityLabel="close-overlay"
      >
        <Pressable
          style={[
            themed($container),
            centered ? undefined : { alignSelf: "stretch" },
          ]}
          onPress={(e) => {
            // 내부 눌렀을 때 모달 닫히지 않도록 버블링 차단
            e.stopPropagation();
          }}
        >
          {/* 헤더 */}
          <View style={themed($headerRow)}>
            <Text style={themed($titleText)}>{title}</Text>
            <View style={themed($headerActions)}>
              <TouchableOpacity
                onPress={handleManualRefresh}
                style={themed($iconButton)}
                accessibilityLabel="refresh"
              >
                <Ionicons name="refresh" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={themed($iconButton)}
                accessibilityLabel="close"
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 필터 탭 */}
          {FilterTabs}

          {/* 에러 메시지 */}
          {error && (
            <View style={themed($errorBox)}>
              <Ionicons
                name="warning"
                size={16}
                color={(theme.colors as any).error || "#E54848"}
                style={{ marginRight: 6 }}
              />
              <Text style={themed($errorText)} numberOfLines={2}>
                포인트 이력을 불러오지 못했습니다. 다시 시도해주세요.
              </Text>
            </View>
          )}

          {/* 리스트 */}
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ListEmptyComponent={ListEmpty}
            ListFooterComponent={ListFooter}
            style={themed($list)}
            contentContainerStyle={themed($listContent)}
            onEndReachedThreshold={0.35}
            onEndReached={() => {
              // 스크롤 바닥 부근 도달 시 자동 로딩
              if (hasNext && !isFetchingMore) {
                loadMore();
              }
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* =========================================================
 * 스타일
 * ======================================================= */

const $overlay: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.55)",
  justifyContent: "center",
  alignItems: "center",
  padding: 12,
});

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: "100%",
  maxWidth: 560,
  maxHeight: "90%",
  backgroundColor: colors.background,
  borderRadius: 20,
  paddingVertical: spacing.md,
  paddingHorizontal: spacing.md,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 10,
  ...(Platform.OS === "web" && {
    backdropFilter: "blur(4px)",
  }),
});

const $headerRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: spacing.sm,
});

const $titleText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
});

const $headerActions: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
});

const $iconButton: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  padding: spacing.xs,
  borderRadius: 12,
  backgroundColor: colors.card,
});

const $filterTabRow: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  marginBottom: spacing.sm,
});

const $filterTab: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  marginRight: spacing.xs,
});

const $filterTabActive: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.tint + "10",
  borderWidth: 1.5,
});

const $filterTabText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "600",
  color: colors.text,
});

const $list: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingBottom: spacing.lg,
});

const $row: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.sm,
  borderRadius: 14,
  backgroundColor: colors.card,
  marginBottom: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
  position: "relative",
});

const $rowLeft: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1.4,
  paddingRight: spacing.sm,
});

const $rowRight: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  alignItems: "flex-end",
  gap: 2,
  minWidth: 120,
});

const $typeBadge: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  fontWeight: "700",
  color: colors.tint,
  marginBottom: 2,
  textTransform: "uppercase",
});

const $description: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  color: colors.text,
  fontWeight: "500",
  marginBottom: 2,
});

const $dateText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
});

const $amountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  fontWeight: "700",
  color: colors.text,
});

const $balanceText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 11,
  color: colors.textDim,
});

const $refTypeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  color: colors.textDim,
  fontStyle: "italic",
});

const $earnDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 8,
  right: 8,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.tint,
  opacity: 0.75,
});

const $spendDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 8,
  right: 8,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: (colors as any).error || "#E54848",
  opacity: 0.75,
});

const $emptyBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.xl,
  alignItems: "center",
  justifyContent: "center",
});

const $emptyText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 14,
});

const $footerBox: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.md,
  alignItems: "center",
  justifyContent: "center",
});

const $loadMoreBtn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 24,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
});

const $loadMoreText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 13,
  fontWeight: "600",
  color: colors.text,
});

const $errorBox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: (colors.tint || "#ff9800") + "15",
  borderWidth: 1,
  borderColor: (colors.tint || "#ff9800") + "66",
  paddingVertical: spacing.xs,
  paddingHorizontal: spacing.sm,
  borderRadius: 10,
  marginBottom: spacing.sm,
});

const $errorText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.text,
  flex: 1,
});

export default PointHistoryModal;

/* =================================================================================
 * 사용 방법 (예시)
 * ---------------------------------------------------------------------------------
 * const [open, setOpen] = useState(false);
 * <PointHistoryModal visible={open} onClose={() => setOpen(false)} />
 *
 * - 탭(전체/적립/차감) 필터
 * - "더 불러오기" 또는 스크롤 바닥 도달 시 추가 페이지 로딩
 * - refetch 버튼으로 새로고침
 * - 추후: 기간(from/to), 타입 단일 선택 드롭다운 등 확장 가능
 * =================================================================================
 */
