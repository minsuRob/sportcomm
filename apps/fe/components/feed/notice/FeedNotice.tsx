import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

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
  defaultMessage = "[공지] 임시 안내: 새로운 커뮤니티 기능을 준비 중입니다. 의견을 남겨주세요!",
  iconName = "megaphone-outline",
  forceShow = false,
  disabled = false,
  onDismiss,
  accessibilityLabel = "피드 공지",
  testID = "feed-notice",
  containerStyle,
  contentStyle,
  textStyle,
  children,
}) => {
  const { themed, theme } = useAppTheme();
  const [checking, setChecking] = useState<boolean>(true);
  const [visible, setVisible] = useState<boolean>(false);

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

  /**
   * 닫기 핸들러
   * - forceShow인 경우에도 닫기 허용 (디자인 선택)
   * - AsyncStorage에 "1" 저장
   */
  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      if (!forceShow) {
        await AsyncStorage.setItem(storageKey, "1");
      }
    } catch (e) {
      console.warn("[FeedNotice] failed to store dismiss flag", e);
    }
    onDismiss?.();
  }, [storageKey, forceShow, onDismiss]);

  // 초기 조회 중이거나 표시 조건이 아니면 렌더하지 않음
  if (checking || !visible || disabled) return null;

  return (
    <View
      style={[themed($noticeContainer), containerStyle]}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <View style={[themed($noticeItem), contentStyle]}>
        <Ionicons name={iconName} size={16} color={theme.colors.tint} />
        <Text
          style={[themed($noticeText), textStyle]}
          numberOfLines={2}
          accessibilityRole="text"
        >
          {children || defaultMessage}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
            style={themed($noticeCloseButton)}
          accessibilityLabel="공지 닫기"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={theme.colors.textDim} />
        </TouchableOpacity>
      </View>
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
 */

// commit: feat(feed): FeedNotice 컴포넌트 분리 및 dismiss 상태 영구 저장
