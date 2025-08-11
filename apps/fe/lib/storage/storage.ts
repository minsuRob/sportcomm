import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 웹과 모바일 환경에서 동일한 인터페이스로 스토리지를 사용하기 위한 모듈입니다.
 * 웹에서는 localStorage를 사용하고, 모바일에서는 AsyncStorage를 사용합니다.
 */

/**
 * 스토리지에 데이터를 저장합니다.
 * @param key - 저장할 데이터의 키
 * @param value - 저장할 데이터의 값
 */
export const setItem = async (key: string, value: string): Promise<void> => {
  console.log(`스토리지 저장 시도: [키: ${key}], [값 존재: ${!!value}]`);
  if (Platform.OS === "web") {
    try {
      // SSR 환경에서는 localStorage가 없을 수 있음
      if (typeof localStorage === "undefined") {
        console.warn("localStorage is not available in SSR environment");
        return;
      }
      localStorage.setItem(key, value);
      console.log(`웹 스토리지에 저장 완료: ${key}`);
    } catch (e) {
      console.error("Error saving to localStorage", e);
    }
  } else {
    try {
      await AsyncStorage.setItem(key, value);
      console.log(`AsyncStorage에 저장 완료: ${key}`);
    } catch (e) {
      console.error("Error saving to AsyncStorage", e);
    }
  }
};

/**
 * 스토리지에서 데이터를 조회합니다.
 * @param key - 조회할 데이터의 키
 * @returns 조회된 데이터의 값 또는 null
 */
export const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    try {
      // SSR 환경에서는 localStorage가 없을 수 있음
      if (typeof localStorage === "undefined") {
        console.warn("localStorage is not available in SSR environment");
        return null;
      }
      const value = localStorage.getItem(key);
      console.log(
        `웹 스토리지에서 조회: [키: ${key}], [결과: ${value ? "값 있음" : "값 없음"}]`
      );
      return value;
    } catch (e) {
      console.error("Error getting from localStorage", e);
      return null;
    }
  } else {
    try {
      const value = await AsyncStorage.getItem(key);
      console.log(
        `AsyncStorage에서 조회: [키: ${key}], [결과: ${value ? "값 있음" : "값 없음"}]`
      );
      return value;
    } catch (e) {
      console.error("Error getting from AsyncStorage", e);
      return null;
    }
  }
};

/**
 * 스토리지에서 데이터를 삭제합니다.
 * @param key - 삭제할 데이터의 키
 */
export const removeItem = async (key: string): Promise<void> => {
  console.log(`스토리지에서 삭제: [키: ${key}]`);
  if (Platform.OS === "web") {
    try {
      // SSR 환경에서는 localStorage가 없을 수 있음
      if (typeof localStorage === "undefined") {
        console.warn("localStorage is not available in SSR environment");
        return;
      }
      localStorage.removeItem(key);
      console.log(`웹 스토리지에서 삭제 완료: ${key}`);
    } catch (e) {
      console.error("Error removing from localStorage", e);
    }
  } else {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`AsyncStorage에서 삭제 완료: ${key}`);
    } catch (e) {
      console.error("Error removing from AsyncStorage", e);
    }
  }
};
