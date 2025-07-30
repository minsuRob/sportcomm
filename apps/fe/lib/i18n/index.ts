import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";

// 언어 리소스 임포트
import ko from "./locales/ko.json";
import en from "./locales/en.json";

/**
 * i18n 설정 및 초기화
 * React Native와 Expo 환경에 최적화된 다국어 지원 시스템
 */

// 지원하는 언어 목록
export const SUPPORTED_LANGUAGES = {
  ko: "한국어",
  en: "English",
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

// AsyncStorage 키
const LANGUAGE_STORAGE_KEY = "user_language";

/**
 * 저장된 언어 설정을 불러오는 함수
 */
const getStoredLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage && storedLanguage in SUPPORTED_LANGUAGES) {
      return storedLanguage as SupportedLanguage;
    }
  } catch (error) {
    console.warn("언어 설정 불러오기 실패:", error);
  }

  // 기본값: 시스템 언어 또는 한국어
  const systemLanguage = Localization.getLocales()[0]?.languageCode;
  return systemLanguage === "en" ? "en" : "ko";
};

/**
 * 언어 설정을 저장하는 함수
 */
export const saveLanguage = async (
  language: SupportedLanguage,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn("언어 설정 저장 실패:", error);
  }
};

/**
 * i18n 초기화 함수
 */
export const initializeI18n = async (): Promise<void> => {
  const savedLanguage = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    // 언어 리소스
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },

    // 기본 언어 설정
    lng: savedLanguage,
    fallbackLng: "ko",

    // 네임스페이스 설정
    defaultNS: "translation",

    // 개발 모드에서 디버그 활성화
    debug: __DEV__,

    // 보간 설정
    interpolation: {
      escapeValue: false, // React에서는 XSS 보호가 기본 제공됨
    },

    // React 설정
    react: {
      useSuspense: false, // React Native에서는 Suspense 비활성화
    },

    // 키 누락 시 처리
    saveMissing: __DEV__, // 개발 모드에서만 누락된 키 저장
    missingKeyHandler: (lng, ns, key) => {
      if (__DEV__) {
        console.warn(`Missing translation key: ${key} for language: ${lng}`);
      }
    },
  });
};

/**
 * 언어 변경 함수
 */
export const changeLanguage = async (
  language: SupportedLanguage,
): Promise<void> => {
  await i18n.changeLanguage(language);
  await saveLanguage(language);
};

/**
 * 현재 언어 가져오기
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

export default i18n;
