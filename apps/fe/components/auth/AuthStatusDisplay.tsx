/**
 * 인증 상태 표시 컴포넌트
 *
 * 개발 및 디버깅을 위한 인증 상태 시각화 컴포넌트입니다.
 * 전역 인증 상태, 사용자 정보, 동기화 상태를 실시간으로 표시합니다.
 */

import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "../../lib/hooks/useAuth";

/**
 * 인증 상태 표시 컴포넌트 Props
 */
interface AuthStatusDisplayProps {
  /** 컴포넌트 표시 여부 (기본값: true) */
  visible?: boolean;
  /** 개발 모드에서만 표시 여부 (기본값: true) */
  devModeOnly?: boolean;
}

/**
 * 인증 상태 표시 컴포넌트
 */
export function AuthStatusDisplay({
  visible = true,
  devModeOnly = true,
}: AuthStatusDisplayProps) {
  const {
    authState,
    isAuthenticated,
    user,
    isLoading,
    isSynced,
    syncUser,
    checkAndSyncAfterSignIn,
    updateProfile,
    signOut,
    resetAuth,
  } = useAuth({
    enableDebugLog: true,
  });

  // 개발 모드에서만 표시하는 경우 체크
  if (devModeOnly && __DEV__ === false) {
    return null;
  }

  // 표시하지 않는 경우
  if (!visible) {
    return null;
  }

  // 수동 동기화 테스트
  const handleManualSync = async () => {
    if (!user) {
      console.log("❌ 사용자 정보가 없어 수동 동기화 불가");
      return;
    }

    const result = await syncUser(
      {
        nickname: user.nickname,
        role: user.role,
      },
      true
    ); // 강제 동기화

    console.log("🔄 수동 동기화 결과:", result);
  };

  // 프로필 업데이트 테스트
  const handleProfileUpdate = async () => {
    if (!user) {
      console.log("❌ 사용자 정보가 없어 프로필 업데이트 불가");
      return;
    }

    const result = await updateProfile({
      bio: `업데이트된 자기소개 - ${new Date().toLocaleTimeString()}`,
    });

    console.log("🔄 프로필 업데이트 결과:", result);
  };

  return (
    <View className="bg-gray-100 dark:bg-gray-800 p-4 m-4 rounded-lg border border-gray-300 dark:border-gray-600">
      <Text className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
        🔐 인증 상태 (개발용)
      </Text>

      {/* 기본 상태 정보 */}
      <View className="space-y-2 mb-4">
        <View className="flex-row">
          <Text className="text-gray-700 dark:text-gray-300 font-medium w-24">
            인증 상태:
          </Text>
          <Text
            className={`font-bold ${isAuthenticated ? "text-green-600" : "text-red-600"}`}
          >
            {isAuthenticated ? "✅ 인증됨" : "❌ 미인증"}
          </Text>
        </View>

        <View className="flex-row">
          <Text className="text-gray-700 dark:text-gray-300 font-medium w-24">
            로딩 상태:
          </Text>
          <Text
            className={`font-bold ${isLoading ? "text-yellow-600" : "text-gray-600"}`}
          >
            {isLoading ? "🔄 로딩 중" : "⏸️ 대기"}
          </Text>
        </View>

        <View className="flex-row">
          <Text className="text-gray-700 dark:text-gray-300 font-medium w-24">
            동기화:
          </Text>
          <Text
            className={`font-bold ${isSynced ? "text-green-600" : "text-orange-600"}`}
          >
            {isSynced ? "✅ 완료" : "⏳ 미완료"}
          </Text>
        </View>

        <View className="flex-row">
          <Text className="text-gray-700 dark:text-gray-300 font-medium w-24">
            토큰:
          </Text>
          <Text
            className={`font-bold ${authState.accessToken ? "text-green-600" : "text-red-600"}`}
          >
            {authState.accessToken ? "✅ 있음" : "❌ 없음"}
          </Text>
        </View>
      </View>

      {/* 사용자 정보 */}
      {user && (
        <View className="bg-white dark:bg-gray-700 p-3 rounded-md mb-4">
          <Text className="text-md font-bold text-gray-900 dark:text-gray-100 mb-2">
            👤 사용자 정보
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 text-sm">
            ID: {user.id.slice(0, 8)}...
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 text-sm">
            닉네임: {user.nickname}
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 text-sm">
            이메일: {user.email}
          </Text>
          <Text className="text-gray-700 dark:text-gray-300 text-sm">
            역할: {user.role}
          </Text>
          {user.bio && (
            <Text className="text-gray-700 dark:text-gray-300 text-sm">
              소개: {user.bio}
            </Text>
          )}
        </View>
      )}

      {/* 테스트 버튼들 */}
      <View className="space-y-2">
        <Text className="text-md font-bold text-gray-900 dark:text-gray-100 mb-2">
          🧪 테스트 액션
        </Text>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={handleManualSync}
            disabled={!isAuthenticated || isLoading}
            className={`flex-1 p-2 rounded-md ${
              !isAuthenticated || isLoading
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-blue-500"
            }`}
          >
            <Text className="text-white text-center text-sm font-medium">
              수동 동기화
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleProfileUpdate}
            disabled={!isAuthenticated || isLoading}
            className={`flex-1 p-2 rounded-md ${
              !isAuthenticated || isLoading
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-green-500"
            }`}
          >
            <Text className="text-white text-center text-sm font-medium">
              프로필 업데이트
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row space-x-2">
          <TouchableOpacity
            onPress={async () => {
              const result = await checkAndSyncAfterSignIn();
              console.log("🔄 재동기화 결과:", result);
            }}
            disabled={!isAuthenticated || isLoading}
            className={`flex-1 p-2 rounded-md ${
              !isAuthenticated || isLoading
                ? "bg-gray-300 dark:bg-gray-600"
                : "bg-purple-500"
            }`}
          >
            <Text className="text-white text-center text-sm font-medium">
              재동기화
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={resetAuth}
            className="flex-1 p-2 rounded-md bg-red-500"
          >
            <Text className="text-white text-center text-sm font-medium">
              상태 리셋
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 상세 상태 정보 (접을 수 있도록) */}
      <View className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600">
        <Text className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          전체 상태: {JSON.stringify(authState, null, 2).slice(0, 200)}...
        </Text>
      </View>
    </View>
  );
}

// 편의를 위한 기본 익스포트
export default AuthStatusDisplay;
