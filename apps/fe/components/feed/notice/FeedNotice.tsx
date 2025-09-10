import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";
import AppDialog from "@/components/ui/AppDialog";
import { useRouter } from "expo-router";
import type { Notice } from "@/lib/notice/types";
import {
  fetchLatestActiveBannerNotice,
  fetchLatestNotices,
} from "@/lib/notice/api";

/**
 * Feed 상단(or 특정 위치)에 표시할 닫기 가능한 공지 컴포넌트
 * - 닫기(X)를 누르면 AsyncStorage에 플래그를 저장하여 이후 재방문 시 숨김
 * - 최신 공지를 여러 건 조회하여 작은 슬라이드/페이드 애니메이션으로 자동 롤링
 * - version(또는 storageKey 변경) 으로 강제 재노출 가능
 */
export interface FeedNoticeProps {
  storageKey?: string;
  defaultMessage?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  forceShow?: boolean;
  disabled?: boolean;
  navigateOnPress?: boolean;
  onDismiss?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  containerStyle?: Partial<ViewStyle>;
  contentStyle?: Partial<ViewStyle>;
  textStyle?: Partial<TextStyle>;
  children?: React.ReactNode;
}

const DEFAULT_STORAGE_KEY = "feed_notice_hidden";
const ROLL_INTERVAL_MS = 20000; // 롤링 간격
const ENTER_MS = 180;
const EXIT_MS = 140;

/**
 * 내부 표시 상태:
 * - checking: AsyncStorage 조회 전 -> null 렌더(깜빡임 방지)
 * - visible: 표시
 * - hidden: 숨김
 */
export const FeedNotice: React.FC<FeedNoticeProps> = ({
  storageKey = DEFAULT_STORAGE_KEY,
  defaultMessage = "",
  iconName = "megaphone-outline",
  forceShow = false,
  disabled = false,
  navigateOnPress = true,
  onDismiss,
  accessibilityLabel = "피드 공지",
  testID = "feed-notice",
  containerStyle,
  contentStyle,
  textStyle,
  children,
}) => {
  const { themed, theme } = useAppTheme();
  const router = useRouter();

  const [checking, setChecking] = useState<boolean>(true);
  const [visible, setVisible] = useState<boolean>(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  // 공지 데이터
  const [bannerNotice, setBannerNotice] = useState<Notice | null>(null);
  const [latestNotices, setLatestNotices] = useState<Notice[]>([]);

  // 애니메이션 값 (0: 숨김/전환 시작, 1: 표시)
  const anim = React.useRef(new Animated.Value(0)).current;
  const slideY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0], // 작은 슬라이드 업 효과
  });

  // 롤링 인덱스
  const [index, setIndex] = useState<number>(0);

  // 공지 조회: 강조 공지 + 최신 공지 여러 건
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [banner, newestList] = await Promise.all([
          fetchLatestActiveBannerNotice({ debug: __DEV__ }),
          fetchLatestNotices({ limit: 5, activeOnly: true, debug: __DEV__ }),
        ]);
        if (!active) return;

        setBannerNotice(banner ?? null);
        setLatestNotices(Array.isArray(newestList) ? newestList : []);
        setIndex(0);
      } catch (e) {
        console.warn("[FeedNotice] 공지 조회 실패", e);
        if (active) {
          setBannerNotice(null);
          setLatestNotices([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 컨텐츠 구성: 강조 공지를 최상단에 배치(중복 제거)
  const entries: Notice[] = useMemo(() => {
    const ids = new Set<string>();
    const list: Notice[] = [];
    if (bannerNotice?.id) {
      ids.add(bannerNotice.id);
      list.push(bannerNotice);
    }
    for (const n of latestNotices) {
      if (n?.id && !ids.has(n.id)) {
        ids.add(n.id);
        list.push(n);
      }
    }
    return list;
  }, [bannerNotice, latestNotices]);

  /**
   * AsyncStorage에서 숨김 여부 로드
   * forceShow = true인 경우 무조건 표시
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (disabled) {
        mounted && setVisible(false);
        mounted && setChecking(false);
        return;
      }
      if (forceShow) {
        mounted && setVisible(true);
        mounted && setChecking(false);
        return;
      }
      try {
        const flag = await AsyncStorage.getItem(storageKey);
        if (!flag) {
          mounted && setVisible(true);
        } else {
          mounted && setVisible(false);
        }
      } catch (e) {
        mounted && setVisible(true);
        console.warn("[FeedNotice] failed to read storage", e);
      } finally {
        mounted && setChecking(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [storageKey, forceShow, disabled]);

  // 표시 상태 변화에 따른 진입 애니메이션
  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, anim]);

  // 새 공지 감지 시 자동 재활성화: 최신(가장 위) 공지 키 계산
  const getCurrentNoticeKey = useCallback((): string | null => {
    const top = entries[0] ?? null;
    return top?.id ? `ID:${top.id}` : null;
  }, [entries]);

  useEffect(() => {
    // 비활성/초기 스토리지 체크 중에는 재활성화 로직을 수행하지 않음
    if (disabled || checking) return;

    (async () => {
      try {
        // 숨김 플래그가 있는 경우에만 재활성화 판단
        const hiddenFlag = await AsyncStorage.getItem(storageKey);
        if (!hiddenFlag) return;

        // 최신(가장 위) 공지가 없으면 판단 불가 → 유지
        if (!entries || entries.length === 0) return;

        const top = entries[0];
        const dismissedKey = await AsyncStorage.getItem(
          `${storageKey}:dismissed_key`,
        );

        if (!dismissedKey) return;

        // DEFAULT로 닫힌 상태에서는 새 ID 공지가 오기 전까지 재활성화하지 않음
        if (dismissedKey.startsWith("ID:")) {
          const lastId = dismissedKey.slice(3);
          if (top.id && top.id !== lastId) {
            await AsyncStorage.removeItem(storageKey);
            setVisible(true);
          }
        }
      } catch (e) {
        console.warn("[FeedNotice] failed to compare notice keys", e);
      }
    })();
  }, [disabled, checking, entries, storageKey]);

  // 자동 롤링: 여러 공지일 때만
  useEffect(() => {
    if (!visible) return;
    if (!entries || entries.length <= 1) return;

    anim.setValue(1); // 표시 상태에서 시작
    let mounted = true;

    const tick = async () => {
      // 퇴장
      await new Promise<void>((resolve) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => resolve());
      });
      if (!mounted) return;
      // 다음 인덱스로
      setIndex((prev) => (prev + 1) % entries.length);
      // 진입
      Animated.timing(anim, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    };

    const id = setInterval(tick, ROLL_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [visible, entries, anim]);

  /**
   * 닫기 버튼 클릭 핸들러
   */
  const handleClosePress = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  /**
   * 닫기 확인 핸들러
   * - 현재 공지 키를 저장하여 이후 새로운 공지(키 변경) 감지 시 자동 재활성화
   */
  const handleConfirmDismiss = useCallback(async () => {
    setShowConfirmDialog(false);
    try {
      // 퇴장 애니메이션 후 숨김
      await new Promise<void>((resolve) => {
        Animated.timing(anim, {
          toValue: 0,
          duration: EXIT_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => resolve());
      });
      setVisible(false);

      if (!forceShow) {
        await AsyncStorage.setItem(storageKey, "1");
        const current = entries[index] ?? null;
        const dismissedKey = current?.id
          ? `ID:${current.id}`
          : `DEFAULT:${defaultMessage}`;
        await AsyncStorage.setItem(`${storageKey}:dismissed_key`, dismissedKey);
      }
    } catch (e) {
      console.warn("[FeedNotice] failed to store dismiss flag", e);
    }
    onDismiss?.();
  }, [storageKey, forceShow, onDismiss, entries, index, defaultMessage, anim]);

  /**
   * 취소 핸들러
   */
  const handleCancelDismiss = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  /**
   * 공지 클릭 → 상세/목록 이동
   */
  const handlePressNotice = useCallback(() => {
    if (!navigateOnPress) return;
    const target = entries[index] ?? null;
    if (target?.id) {
      router.push({
        pathname: "/(details)/notice/[noticeId]",
        params: { noticeId: target.id },
      });
    } else {
      router.push("/(details)/notice");
    }
  }, [navigateOnPress, entries, index, router]);

  // 표시 텍스트 결정
  const displayTitle =
    (entries[index] && entries[index].title) ||
    defaultMessage ||
    "[공지] 새로운 소식이 있습니다.";

  // 초기/비표시 조건
  if (checking || !visible || disabled) return null;

  return (
    <Animated.View
      style={[
        themed($noticeContainer),
        containerStyle,
        { opacity: anim, transform: [{ translateY: slideY }] },
      ]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <TouchableOpacity
        style={[themed($noticeItem), contentStyle]}
        activeOpacity={0.85}
        onPress={handlePressNotice}
        accessibilityRole="button"
        accessibilityLabel="공지 상세 보기로 이동"
      >
        <Ionicons name={iconName} size={16} color={theme.colors.tint} />
        <Text
          style={[themed($noticeText), textStyle]}
          numberOfLines={2}
          accessibilityRole="text"
        >
          {children || displayTitle}
        </Text>
        <TouchableOpacity
          onPress={(e: any) => {
            e?.stopPropagation?.();
            handleClosePress();
          }}
          style={themed($noticeCloseButton)}
          accessibilityLabel="공지 닫기"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.textDim} />
        </TouchableOpacity>
      </TouchableOpacity>

      <AppDialog
        visible={showConfirmDialog}
        onClose={handleCancelDismiss}
        title="공지 닫기"
        description="공지를 닫으시겠습니까? 다음 공지까지 표시되지 않습니다."
        confirmText="닫기"
        cancelText="취소"
        onConfirm={handleConfirmDismiss}
      />
    </Animated.View>
  );
};

// -------- 스타일 정의 --------
const $noticeContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.backgroundAlt,
  borderBottomColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
});

const $noticeItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.xs,
  justifyContent: "center",
  minHeight: 32,
});

const $noticeText: ThemedStyle<TextStyle> = ({ colors }) => ({
  flex: 1,
  color: colors.textDim,
  fontSize: 13,
  fontWeight: "600",
});

const $noticeCloseButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 28,
  height: 28,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
  marginLeft: spacing.xs,
});

export default FeedNotice;

/**
 * 변경 요약:
 * - 최신 공지 여러 건 롤링(슬라이드/페이드) 표시
 * - AsyncStorage 닫힘 상태 유지 + 새 공지 도착 시 자동 재활성화
 * - 웹/iOS/Android 공통 Animated 기반으로 가벼운 전환 적용
 */
