import React, { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import ActionSheet, { ActionSheetOption } from "@/components/ActionSheet";
import { useAppTheme } from "@/lib/theme/context";
import { useTranslation } from "@/lib/i18n/useTranslation";

export interface ProfileContextMenuProps {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void; // 프로필 화면 이동
}

/**
 * 프로필 버튼을 위한 설정/프로필 전용 컨텍스트 메뉴
 * - 테마, 언어, 앱색상 설정을 바로 토글/선택할 수 있도록 제공합니다.
 * - 다른 화면에서도 재사용 가능하도록 범용 액션시트 옵션으로 구성합니다.
 */
export default function ProfileContextMenu({
  visible,
  onClose,
  onOpenProfile,
}: ProfileContextMenuProps) {
  const { theme, toggleTheme, setAppColor, appColor } = useAppTheme();
  const { currentLanguage, switchLanguage } = useTranslation();

  const options: ActionSheetOption[] = useMemo(() => {
    const opts: ActionSheetOption[] = [];

    // 내 프로필 열기
    opts.push({
      text: "내 프로필 열기",
      onPress: onOpenProfile,
      icon: (
        <Ionicons
          name="person-circle-outline"
          size={20}
          color={theme.colors.text}
        />
      ),
    });

    // 구분선 대용 빈 옵션은 넣지 않고 순차 배치

    // 테마 토글
    opts.push({
      text: theme.isDark ? "라이트 테마로" : "다크 테마로",
      onPress: toggleTheme,
      icon: (
        <Ionicons
          name={theme.isDark ? "sunny-outline" : "moon-outline"}
          size={20}
          color={theme.colors.text}
        />
      ),
    });

    // 언어 전환
    opts.push({
      text: currentLanguage === "ko" ? "English로 전환" : "한국어로 전환",
      onPress: () => switchLanguage(currentLanguage === "ko" ? "en" : "ko"),
      icon: (
        <Ionicons name="globe-outline" size={20} color={theme.colors.text} />
      ),
    });

    // 앱 색상 (하나 선택형) - 간단히 순환 토글
    const nextColor =
      appColor === "blue" ? "red" : appColor === "red" ? "orange" : "blue";
    const appColorKorean =
      appColor === "blue" ? "파랑" : appColor === "red" ? "빨강" : "주황";
    const nextColorKorean =
      nextColor === "blue" ? "파랑" : nextColor === "red" ? "빨강" : "주황";
    opts.push({
      text: `앱 색상: ${appColorKorean} → ${nextColorKorean}`,
      onPress: () => setAppColor(nextColor as any),
      icon: (
        <Ionicons
          name="color-palette-outline"
          size={20}
          color={theme.colors.text}
        />
      ),
    });

    // 취소
    opts.push({
      text: "취소",
      onPress: () => {},
      style: "cancel",
    });

    return opts;
  }, [
    theme,
    toggleTheme,
    currentLanguage,
    switchLanguage,
    appColor,
    setAppColor,
    onOpenProfile,
  ]);

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      title="프로필 메뉴"
      options={options}
    />
  );
}
