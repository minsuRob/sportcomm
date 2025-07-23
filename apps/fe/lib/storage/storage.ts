import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  } else {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.error('Error saving to AsyncStorage', e);
    }
  }
};

/**
 * 스토리지에서 데이터를 조회합니다.
 * @param key - 조회할 데이터의 키
 * @returns 조회된 데이터의 값 또는 null
 */
export const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Error getting from localStorage', e);
      return null;
    }
  } else {
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.error('Error getting from AsyncStorage', e);
      return null;
    }
  }
};

/**
 * 스토리지에서 데이터를 삭제합니다.
 * @param key - 삭제할 데이터의 키
 */
export const removeItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage', e);
    }
  } else {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from AsyncStorage', e);
    }
  }
};