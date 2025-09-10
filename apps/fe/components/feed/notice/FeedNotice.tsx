import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
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
  fetchNewestNotice,
} from "@/lib/notice/api";

/**
 * Feed 상단(or 특정 위치)에 표시할 닫기 가능한 공지 컴포넌트
 * - 닫기(X)를 누르면 AsyncStorage에 플래그를 저장하여 이후 재방문 시 숨김
 * - props.children 을 제공하면 기본 메시지 대신 렌더
 * - version(또는 storageKey 변경) 을 통해 강제 재노출 가능
 *
 * 예시 사용:
 * <FeedNotice defaultMessage="새 기능을 준비중입니다. 의견을 남겨주세요!" />
 */

export interface FeedNoticeProps {
  /** AsyncStorage Key (버전 변경 시 Suffix 조정) */
  storageKey?: string;
  /** 기본 문구 (children 지정 시 무시) */
  defaultMessage?: string;
  /** Ionicons 아이콘 이름 */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** 강제로 항상 표시 (스토리지 무시) */
  forceShow?: boolean;
  /** 표시 비활성화 (조건부 렌더 외부 제어) */
  disabled?: boolean;
  /** 공지를 탭하면 상세(또는 공지 목록)으로 이동할지 여부 (기본 true) */
  navigateOnPress?: boolean;
  /** 닫기 후 콜백 */
  onDismiss?: () => void;
  /** 커스텀 접근성 라벨 */
  accessibilityLabel?: string;
  /** 테스트용 ID */
  testID?: string;
  /** 외부 스타일 확장 (컨테이너) */
  containerStyle?: Partial<ViewStyle>;
  /** 외부 스타일 확장 (내부 아이템) */
  contentStyle?: Partial<ViewStyle>;
  /** 텍스트 스타일 확장 */
  textStyle?: Partial<TextStyle>;
  /** children 전달 시 메시지 대체 */
  children?: React.ReactNode;
}

const DEFAULT_STORAGE_KEY = "feed_notice_hidden";

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
  // 최신 강조(highlightBanner) 공지 및 '가장 최근' 공지
  const [bannerNotice, setBannerNotice] = useState<Notice | null>(null);
  const [newestNotice, setNewestNotice] = useState<Notice | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // 강조 공지와 가장 최신 공지를 병렬로 조회
        const [latestBanner, newest] = await Promise.all([
          fetchLatestActiveBannerNotice({ debug: __DEV__ }),
          fetchNewestNotice({ debug: __DEV__ }),
        ]);
        if (active) {
          setBannerNotice(latestBanner);
          setNewestNotice(newest);
        }
      } catch (e) {
        console.warn("[FeedNotice] 공지 조회 실패", e);
        if (active) {
          setBannerNotice(null);
          setNewestNotice(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
        // 조회 실패 시에는 UX상 표시 (사용자에게 정보를 보여주는 것이 더 낫다)
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

  // 새 공지 감지 시 자동 재활성화: 마지막으로 닫은 noticeKey와 현재 noticeKey 비교
  const getCurrentNoticeKey = useCallback((): string => {
    const target = bannerNotice ?? newestNotice;
    return target?.id ? `ID:${target.id}` : `DEFAULT:${defaultMessage}`;
  }, [bannerNotice, newestNotice, defaultMessage]);

  useEffect(() => {
    // disabled 상태에서는 동작하지 않음
    if (disabled) return;
    (async () => {
      try {
        const currentKey = getCurrentNoticeKey();
        const dismissedKey = await AsyncStorage.getItem(
          `${storageKey}:dismissed_key`,
        );
        // 이전에 닫은 키와 현재 키가 다르면 새로운 공지로 판단 → 숨김 플래그 제거 및 재표시
        if (dismissedKey && dismissedKey !== currentKey) {
          await AsyncStorage.removeItem(storageKey);
          setVisible(true);
        }
      } catch (e) {
        console.warn("[FeedNotice] failed to compare notice keys", e);
      }
    })();
  }, [
    bannerNotice,
    newestNotice,
    defaultMessage,
    storageKey,
    disabled,
    getCurrentNoticeKey,
  ]);

  /**
   * 닫기 버튼 클릭 핸들러
   * - 확인 다이얼로그 표시
   */
  const handleClosePress = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  /**
   * 닫기 확인 핸들러
   * - 실제 닫기 처리
   * - 현재 공지 키를 저장하여 이후 새로운 공지(키 변경) 감지 시 자동 재활성화
   */
  const handleConfirmDismiss = useCallback(async () => {
    setShowConfirmDialog(false);
    setVisible(false);
    try {
      if (!forceShow) {
        // 숨김 플래그
        await AsyncStorage.setItem(storageKey, "1");
        // 마지막으로 닫은 공지 키 저장 (공지 ID가 있으면 ID, 없으면 DEFAULT:문구)
        const dismissedKey = ((): string => {
          const target = bannerNotice ?? newestNotice;
          return target?.id ? `ID:${target.id}` : `DEFAULT:${defaultMessage}`;
        })();
        await AsyncStorage.setItem(`${storageKey}:dismissed_key`, dismissedKey);
      }
    } catch (e) {
      console.warn("[FeedNotice] failed to store dismiss flag", e);
    }
    onDismiss?.();
  }, [
    storageKey,
    forceShow,
    onDismiss,
    bannerNotice,
    newestNotice,
    defaultMessage,
  ]);

  /**
   * 취소 핸들러
   */
  const handleCancelDismiss = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);
  /**
   * 공지 영역 클릭 → 상세 또는 목록 이동
   * - 강조 공지 존재 시 해당 공지 상세
   * - 없으면 공지 목록
   */
  const handlePressNotice = useCallback(() => {
    if (!navigateOnPress) return;
    const target = bannerNotice ?? newestNotice;
    if (target) {
      router.push({
        pathname: "/(details)/notice/[noticeId]",
        params: { noticeId: target.id },
      });
    } else {
      router.push("/(details)/notice");
    }
  }, [navigateOnPress, bannerNotice, newestNotice, router]);

  // 표시 텍스트 결정: 강조 공지 > 최신 공지 > 기본 메시지
  const displayTitle =
    (bannerNotice && bannerNotice.title) ||
    (newestNotice && newestNotice.title) ||
    defaultMessage ||
    "[공지] 새로운 소식이 있습니다.";

  // 초기 조회 중이거나 표시 조건이 아니면 렌더하지 않음
  if (checking || !visible || disabled) return null;

  return (
    <View
      style={[themed($noticeContainer), containerStyle]}
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

      {/* 공지 닫기 확인 다이얼로그 */}
      <AppDialog
        visible={showConfirmDialog}
        onClose={handleCancelDismiss}
        title="공지 닫기"
        description="공지를 닫으시겠습니까? 다음 공지까지 표시되지 않습니다."
        confirmText="닫기"
        cancelText="취소"
        onConfirm={handleConfirmDismiss}
      />
    </View>
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

// 기본 내보내기
export default FeedNotice;

/**
 * 변경 요약:
 * - Feed 화면 내 임시 공지 UI를 재사용 가능한 FeedNotice 컴포넌트로 분리
 * - AsyncStorage 기반 dismiss 상태 저장
 * - props 로 메시지/아이콘/키/강제표시 제어
 * - 공지 클릭 시 최신 강조(highlightBanner) 공지 상세 또는 목록으로 네비게이션 추가
 */

// commit: feat(feed): FeedNotice 클릭 시 공지 상세/목록 네비게이션 및 강조 공지 연동
