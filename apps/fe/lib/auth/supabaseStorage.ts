/**
 * 통합 Supabase Storage 어댑터 (웹/네이티브 공용)
 *
 * 목적:
 * - Supabase Auth 세션을 전 플랫폼에서 일관되게 저장/조회/삭제하기 위한 어댑터
 * - 웹: localStorage 사용
 * - iOS/Android(네이티브): AsyncStorage 사용 (동적 require)
 *
 * 특징:
 * - SSR/비브라우저 환경에서 localStorage 접근 방지
 * - 모든 메서드는 Promise 기반(비동기)으로 구현하여 supabase-js와 호환
 *
 * 사용법:
 * - Supabase 클라이언트 생성 시 auth.storage 에 주입
 *   createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storage: supabaseStorage, ... } })
 */

import { Platform } from "react-native";
import type { SupportedStorage } from "@supabase/supabase-js";

/**
 * 네이티브 환경에서만 AsyncStorage 로드 (웹/SSR 환경 보호)
 * - 타입 힌트: 동적 import 반환 타입과 동일하게 지정
 */
let RNAsyncStorage: typeof import("@react-native-async-storage/async-storage").default | null =
  null;

if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RNAsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (error) {
    // 네이티브 환경인데 AsyncStorage 로드 실패 시, 이후 스토리지 동작은 no-op 처리됨
    console.warn("[supabaseStorage] AsyncStorage 모듈 로드 실패:", error);
  }
}

/**
 * 웹 환경에서 localStorage 사용 가능 여부 체크
 * - SSR/브라우저 보안 설정 등으로 인해 접근 불가할 수 있으므로 안전 점검
 */
const isLocalStorageAvailable = (): boolean => {
  try {
    // 브라우저 환경 확인
    if (Platform.OS !== "web") return false;
    // 일부 런타임(SSR)에서는 window 가 없을 수 있음
    if (typeof window === "undefined" || !window.localStorage) return false;

    const testKey = "__sportcomm_ls_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

/**
 * SupportedStorage 구현체
 * - supabase-js v2 가 요구하는 인터페이스
 * - 모든 메서드는 Promise를 반환해야 함
 */
export const supabaseStorage: SupportedStorage = {
  /**
   * 스토리지에서 값을 조회합니다.
   * @param key 조회 키
   * @returns 저장된 문자열 또는 null
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === "web") {
        if (!isLocalStorageAvailable()) return null;
        return window.localStorage.getItem(key);
      }
      if (RNAsyncStorage) {
        return await RNAsyncStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error(`[supabaseStorage] getItem 실패: key=${key}`, error);
      return null;
    }
  },

  /**
   * 스토리지에 값을 저장합니다.
   * @param key 저장 키
   * @param value 저장 값
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (!isLocalStorageAvailable()) return;
        window.localStorage.setItem(key, value);
        return;
      }
      if (RNAsyncStorage) {
        await RNAsyncStorage.setItem(key, value);
        return;
      }
    } catch (error) {
      console.error(`[supabaseStorage] setItem 실패: key=${key}`, error);
    }
  },

  /**
   * 스토리지에서 값을 삭제합니다.
   * @param key 삭제 키
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        if (!isLocalStorageAvailable()) return;
        window.localStorage.removeItem(key);
        return;
      }
      if (RNAsyncStorage) {
        await RNAsyncStorage.removeItem(key);
        return;
      }
    } catch (error) {
      console.error(`[supabaseStorage] removeItem 실패: key=${key}`, error);
    }
  },
};

export default supabaseStorage;
