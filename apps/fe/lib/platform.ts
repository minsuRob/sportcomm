import { Platform } from "react-native";

/**
 * 플랫폼 감지 유틸리티
 *
 * 이 모듈은 현재 실행 환경이 웹인지 React Native인지 감지하는 유틸리티 함수들을 제공합니다.
 * 이를 통해 플랫폼에 따라 다르게 동작해야 하는 코드를 조건부로 실행할 수 있습니다.
 */

/**
 * 실행 환경이 웹 브라우저인지 확인합니다.
 * @returns 웹 환경이면 true, 아니면 false
 */
export const isWeb = (): boolean => {
  try {
    // SSR 환경에서는 Platform.OS가 'web'으로 설정됨
    // TODO: 검증 필요
    if (typeof Platform !== "undefined" && Platform.OS === "web") {
      return true;
    }

    // Web 환경인지 확인: window와 document 객체가 존재하고,
    // React Native 또는 Expo 환경이 아닌 경우
    return (
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      // @ts-ignore - navigator.product는 React Native에서 'ReactNative'
      typeof navigator !== "undefined" &&
      navigator.product !== "ReactNative"
    );
  } catch (e) {
    return false;
  }
};

/**
 * 실행 환경이 React Native인지 확인합니다.
 * @returns React Native 환경이면 true, 아니면 false
 */
export const isReactNative = (): boolean => {
  try {
    // React Native 환경 확인 방법:
    // 1. Platform 객체 존재 여부
    // 2. navigator.product가 'ReactNative'인지 확인
    // 3. global.expo 객체의 존재로 Expo 환경 확인
    // 4. __DEV__ 전역 변수 존재 확인 (React Native 개발 환경)

    // Platform 객체 존재 여부 확인 (가장 신뢰할 수 있는 방법)
    if (typeof Platform !== "undefined") {
      return true;
    }

    // 기타 확인 방법들
    return (
      // @ts-ignore - 타입 체크 무시
      (typeof navigator !== "undefined" &&
        navigator.product === "ReactNative") ||
      // @ts-ignore - global은 React Native에서만 접근 가능
      (typeof global !== "undefined" && "expo" in global) ||
      // @ts-ignore - __DEV__는 React Native에서 사용
      typeof __DEV__ !== "undefined" ||
      // @ts-ignore - window.ReactNative는 React Native 웹에서 사용 가능
      (typeof window !== "undefined" && window.ReactNative)
    );
  } catch (e) {
    return false;
  }
};

/**
 * 실행 환경이 Android인지 확인합니다.
 * @returns Android 환경이면 true, 아니면 false
 */
export const isAndroid = (): boolean => {
  try {
    // React Native 환경이고 플랫폼이 Android인 경우
    return isReactNative() && Platform.OS === "android";
  } catch (e) {
    return false;
  }
};

/**
 * 실행 환경이 iOS인지 확인합니다.
 * @returns iOS 환경이면 true, 아니면 false
 */
export const isIOS = (): boolean => {
  try {
    // React Native 환경이고 플랫폼이 iOS인 경우
    return isReactNative() && Platform.OS === "ios";
  } catch (e) {
    return false;
  }
};

/**
 * 플랫폼 종류
 */
export type PlatformType =
  | "web"
  | "react-native"
  | "android"
  | "ios"
  | "unknown";

/**
 * 현재 실행 중인 플랫폼을 반환합니다.
 * @returns 플랫폼 종류 문자열
 */
export const getPlatformType = (): PlatformType => {
  if (isWeb()) return "web";
  if (isAndroid()) return "android";
  if (isIOS()) return "ios";
  if (isReactNative()) return "react-native";
  return "unknown";
};

/**
 * 현재 환경에 따라 다른 값을 반환합니다.
 * @param web 웹 환경에서 반환할 값
 * @param native React Native 환경에서 반환할 값
 * @returns 환경에 맞는 값
 */
export function platformSelect<T>(web: T, native: T): T {
  return isWeb() ? web : native;
}

/**
 * 현재 실행 환경이 웹 브라우저인지 React Native인지를 로깅합니다.
 * 디버깅 용도로 사용할 수 있습니다.
 */
export function logPlatformInfo(): void {
  console.log("환경 감지 결과:");
  console.log(`- 웹 환경: ${isWeb()}`);
  console.log(`- React Native 환경: ${isReactNative()}`);
  console.log(`- Android: ${isAndroid()}`);
  console.log(`- iOS: ${isIOS()}`);
  console.log(`- 플랫폼 타입: ${getPlatformType()}`);

  // 디버깅에 유용한 추가 정보
  if (isReactNative()) {
    console.log(`- React Native Platform.OS: ${Platform.OS}`);
    console.log(`- React Native Platform.Version: ${Platform.Version}`);
  }

  // 브라우저 환경 정보
  if (isWeb() && typeof navigator !== "undefined") {
    console.log(`- 브라우저: ${navigator.userAgent}`);
  }
}
