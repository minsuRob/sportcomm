import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  TextInput,
  ViewStyle,
  TextStyle,
  Animated,
  Easing,
} from "react-native";
import { Portal } from "@rn-primitives/portal";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

export interface AppDialogInputProps {
  /** 입력 필드 플레이스홀더 */
  placeholder?: string;
  /** 현재 입력 값 */
  value: string;
  /** 입력 변경 핸들러 */
  onChangeText: (text: string) => void;
  /** 다중 행 입력 여부 (기본값 true) */
  multiline?: boolean;
  /** 최대 길이 제한 */
  maxLength?: number;
}

export interface AppDialogProps {
  /** 다이얼로그 표시 여부 */
  visible: boolean;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 확인 콜백 */
  onConfirm?: () => void;
  /** 제목 텍스트 또는 커스텀 노드 */
  title?: ReactNode;
  /** 본문 텍스트 또는 커스텀 노드 */
  description?: ReactNode;
  /** 상단 이미지 (옵션) */
  imageSource?: ImageSourcePropType;
  /** 입력 필드 옵션 (옵션) */
  inputProps?: AppDialogInputProps;
  /** 커스텀 본문 콘텐츠 (옵션). 제공되면 description 대신 렌더 */
  children?: ReactNode;
  /** 확인 버튼 라벨 (기본값 "확인") */
  confirmText?: string;
  /** 취소 버튼 라벨 (기본값 "취소") */
  cancelText?: string;
  /** 취소 버튼 표시 여부 (기본값 true) */
  showCancel?: boolean;
  /** 바깥 영역 탭 시 닫기 여부 (기본값 true) */
  dismissOnBackdrop?: boolean;
  /** 확인 버튼 비활성화 여부 */
  confirmDisabled?: boolean;
}

/**
 * 중앙 배치형 앱 공통 다이얼로그
 * - 제목, 본문, 이미지, 입력 필드, 확인/취소 버튼을 지원
 * - `children`을 통해 임의의 컴포넌트를 삽입 가능 (확장성)
 * - Portal 기반으로 어디서든 안정적으로 오버레이됨
 */
export default function AppDialog({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  imageSource,
  inputProps,
  children,
  confirmText = "확인",
  cancelText = "취소",
  showCancel = true,
  dismissOnBackdrop = true,
  confirmDisabled = false,
}: AppDialogProps) {
  const { themed, theme } = useAppTheme();

  // 애니메이션 상태 관리
  const [shouldRender, setShouldRender] = useState<boolean>(visible);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.92)).current;
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogTranslateY = useRef(new Animated.Value(8)).current;

  // visible 변경에 따른 페이드 인/아웃 + 스케일 애니메이션 처리
  useEffect(() => {
    if (visible) {
      // 렌더 먼저 수행 후 인 애니메이션 시작
      setShouldRender(true);
      Animated.parallel([
        // 배경 페이드 인
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // 다이얼로그 페이드 인
        Animated.timing(dialogOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // 아래에서 위로 살짝 슬라이드 인
        Animated.spring(dialogTranslateY, {
          toValue: 0,
          damping: 14,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
        // 스프링 오버슈트 → 정착으로 더 역동적인 팝 효과
        Animated.sequence([
          Animated.spring(dialogScale, {
            toValue: 1.03,
            damping: 12,
            stiffness: 220,
            mass: 0.6,
            useNativeDriver: true,
          }),
          Animated.spring(dialogScale, {
            toValue: 1,
            damping: 14,
            stiffness: 220,
            mass: 0.6,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // 아웃 애니메이션 후 언마운트
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dialogOpacity, {
          toValue: 0,
          duration: 140,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        // 살짝 아래로 미끄러지듯 퇴장
        Animated.timing(dialogTranslateY, {
          toValue: 8,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // 미세 축소 후 사라짐
        Animated.timing(dialogScale, {
          toValue: 0.98,
          duration: 160,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Portal name="app-dialog">
      <Animated.View style={[themed($overlay), { opacity: overlayOpacity }]}>
        <TouchableOpacity
          style={themed($backdrop)}
          activeOpacity={1}
          onPress={() => (dismissOnBackdrop ? onClose() : undefined)}
        />

        <Animated.View
          style={[
            themed($container),
            {
              opacity: dialogOpacity,
              transform: [
                { scale: dialogScale },
                { translateY: dialogTranslateY },
              ],
            },
          ]}
        >
          {imageSource ? (
            <Image
              source={imageSource}
              style={themed($image)}
              resizeMode="cover"
            />
          ) : null}

          {title ? <Text style={themed($title)}>{title}</Text> : null}

          {children ? (
            <View style={themed($content)}>{children}</View>
          ) : description ? (
            <Text style={themed($description)}>{description}</Text>
          ) : null}

          {inputProps ? (
            <TextInput
              style={themed($input)}
              placeholder={inputProps.placeholder}
              placeholderTextColor={theme.colors.textDim}
              value={inputProps.value}
              onChangeText={inputProps.onChangeText}
              multiline={inputProps.multiline ?? true}
              maxLength={inputProps.maxLength}
              textAlignVertical="top"
            />
          ) : null}

          <View style={themed($actions)}>
            {showCancel ? (
              <TouchableOpacity style={themed($btnSecondary)} onPress={onClose}>
                <Text style={themed($btnSecondaryText)}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                themed($btnPrimary),
                confirmDisabled ? { opacity: 0.6 } : null,
              ]}
              onPress={onConfirm}
              disabled={confirmDisabled}
            >
              <Text style={themed($btnPrimaryText)}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Portal>
  );
}

// --- 스타일 ---
const $overlay: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2000,
  alignItems: "center",
  justifyContent: "center",
});

const $backdrop: ThemedStyle<ViewStyle> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.35)",
});

const $container: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 320,
  maxWidth: "90%",
  backgroundColor: colors.card,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
});

import { ImageStyle } from "react-native";

const $image: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: "100%",
  height: 140,
  borderRadius: 12,
  marginBottom: spacing.md,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  fontWeight: "700",
  color: colors.text,
  textAlign: "center",
});

const $content: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.sm,
});

const $description: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  color: colors.textDim,
  textAlign: "center",
  lineHeight: 20,
});

const $input: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 10,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  minHeight: 90,
  color: colors.text,
  backgroundColor: colors.background,
});

const $actions: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  flexDirection: "row",
  gap: spacing.sm,
  marginTop: spacing.lg,
});

const $btnSecondary: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: colors.border,
  alignItems: "center",
  justifyContent: "center",
});

const $btnSecondaryText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontSize: 16,
  fontWeight: "600",
});

const $btnPrimary: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  paddingVertical: spacing.sm,
  borderRadius: 10,
  backgroundColor: colors.tint,
  alignItems: "center",
  justifyContent: "center",
});

const $btnPrimaryText: ThemedStyle<TextStyle> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "700",
});
