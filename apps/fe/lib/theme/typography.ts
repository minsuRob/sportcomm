// TODO: write documentation about fonts and typography along with guides on how to add custom fonts in own
// markdown file and add links from here

import { Platform } from "react-native";
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from "@expo-google-fonts/space-grotesk";

// 기본 폰트 설정
export const fonts = {
  // 시스템 기본 폰트들
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
  spaceGroteskBold,
};

// 플랫폼별 폰트 패밀리 이름
export const fontFamily = {
  // 시스템 폰트
  regular: "SpaceGrotesk-Regular",
  medium: "SpaceGrotesk-Medium",
  semiBold: "SpaceGrotesk-SemiBold",
  bold: "SpaceGrotesk-Bold",

  // 커스텀 폰트 - 플랫폼별로 다른 이름 사용
  custom: Platform.select({
    web: "TTTogether", // 웹: 웹 폰트 패밀리 이름
    default: "TTTogether", // iOS/Android: expo-font 로드 키 이름과 동일하게 사용
  }),
};

// 폰트 크기 상수
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
  "5xl": 48,
  "6xl": 60,
};

// 폰트 스타일 정의
export const typography = {
  // 기본 텍스트 스타일
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
  },

  // 제목 스타일
  heading: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize["2xl"],
  },

  // 커스텀 폰트 스타일
  custom: {
    fontFamily: fontFamily.custom,
    fontSize: fontSize.base,
  },

  // 로고 스타일
  logo: {
    normal: fontFamily.custom, // TTTogether 폰트 사용
    bold: fontFamily.custom, // 필요시 별도 볼드 폰트 설정
  },

  // 포인트 배지/강조용 폰트 (크로스플랫폼 안전한 외부 폰트 사용)
  points: {
    normal: "SpaceGrotesk-SemiBold",
    bold: "SpaceGrotesk-Bold",
  },

  // 기존 호환성 유지
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semiBold: fontFamily.semiBold,
  bold: fontFamily.bold,
};
