/**
 * 플랫폼별 백 버튼 처리 유틸리티
 * Android 백 버튼과 iOS 제스처를 통합 관리
 */

import { useEffect, useCallback } from "react";
import { BackHandler, Platform } from "react-native";
import { useRouter } from "expo-router";

export interface BackHandlerOptions {
  /** 백 버튼 처리 함수. true를 반환하면 기본 동작을 막음 */
  onBackPress?: () => boolean;
  /** 모달이나 오버레이가 열려있는지 여부 */
  isModalOpen?: boolean;
  /** 모달 닫기 함수 */
  onCloseModal?: () => void;
  /** 커스텀 백 동작이 활성화되어야 하는지 여부 */
  enabled?: boolean;
}

/**
 * Android 백 버튼 처리를 위한 커스텀 훅
 *
 * @example
 * ```tsx
 * const [showModal, setShowModal] = useState(false);
 *
 * useBackHandler({
 *   isModalOpen: showModal,
 *   onCloseModal: () => setShowModal(false),
 *   enabled: true
 * });
 * ```
 */
export function useBackHandler({
  onBackPress,
  isModalOpen = false,
  onCloseModal,
  enabled = true,
}: BackHandlerOptions = {}) {
  const router = useRouter();

  const handleBackPress = useCallback(() => {
    // 커스텀 핸들러가 비활성화된 경우 기본 동작 허용
    if (!enabled) {
      return false;
    }

    // 모달이 열려있는 경우 모달 닫기
    if (isModalOpen && onCloseModal) {
      onCloseModal();
      return true; // 기본 백 동작 막기
    }

    // 커스텀 백 처리 함수가 있는 경우 실행
    if (onBackPress) {
      return onBackPress();
    }

    // 기본 동작 허용 (이전 화면으로 이동)
    return false;
  }, [enabled, isModalOpen, onCloseModal, onBackPress]);

  useEffect(() => {
    // Android에서만 BackHandler 등록
    if (Platform.OS === "android") {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      return () => subscription.remove();
    }
  }, [handleBackPress]);
}

/**
 * 모달/바텀시트용 백 핸들러 훅
 * 모달이 열려있을 때 백 버튼으로 모달을 닫을 수 있게 함
 */
export function useModalBackHandler(
  isVisible: boolean,
  onClose: () => void,
  enabled: boolean = true,
) {
  return useBackHandler({
    isModalOpen: isVisible,
    onCloseModal: onClose,
    enabled: enabled && isVisible,
  });
}

/**
 * 확인 다이얼로그와 함께 앱 종료를 처리하는 훅
 * 루트 화면에서 사용
 */
export function useExitAppHandler(enabled: boolean = true) {
  const handleBackPress = useCallback(() => {
    if (!enabled) return false;

    // TODO: 확인 다이얼로그 표시
    // Alert.alert(
    //   "앱 종료",
    //   "앱을 종료하시겠습니까?",
    //   [
    //     { text: "취소", style: "cancel" },
    //     { text: "종료", onPress: () => BackHandler.exitApp() }
    //   ]
    // );

    // 임시로 바로 종료 (실제로는 위의 다이얼로그 사용)
    BackHandler.exitApp();
    return true;
  }, [enabled]);

  return useBackHandler({
    onBackPress: handleBackPress,
    enabled,
  });
}
