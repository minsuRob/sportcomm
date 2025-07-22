import React, { useState, useEffect } from "react";
import { View, Text, Animated, Dimensions } from "react-native";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
}

interface CustomToastProps {
  // Props는 필요 없음 - 전역 상태로 관리
}

// 전역 토스트 상태
let toastMessages: ToastMessage[] = [];
let toastListeners: ((messages: ToastMessage[]) => void)[] = [];

// 고유 ID 생성을 위한 카운터
let toastCounter = 0;

// 전역 토스트 함수
export const showToast = (toast: Omit<ToastMessage, "id">) => {
  const id = `toast_${Date.now()}_${++toastCounter}`;
  const newToast: ToastMessage = {
    id,
    duration: 4000,
    ...toast,
  };

  toastMessages = [...toastMessages, newToast];
  toastListeners.forEach((listener) => listener(toastMessages));

  // 자동 제거
  setTimeout(() => {
    hideToast(id);
  }, newToast.duration);
};

export const hideToast = (id: string) => {
  toastMessages = toastMessages.filter((toast) => toast.id !== id);
  toastListeners.forEach((listener) => listener(toastMessages));
};

export default function CustomToast({}: CustomToastProps) {
  const { themed } = useAppTheme();
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [animations, setAnimations] = useState<{
    [key: string]: Animated.Value;
  }>({});

  useEffect(() => {
    const listener = (newMessages: ToastMessage[]) => {
      setMessages(newMessages);

      // 새로운 메시지에 대한 애니메이션 생성
      newMessages.forEach((message) => {
        setAnimations((prev) => {
          if (!prev[message.id]) {
            const animValue = new Animated.Value(0);

            // 슬라이드 인 애니메이션
            Animated.timing(animValue, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();

            return { ...prev, [message.id]: animValue };
          }
          return prev;
        });
      });
    };

    toastListeners.push(listener);

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []); // 의존성 배열을 비워서 무한 루프 방지

  const getToastColor = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return "#4CAF50";
      case "error":
        return "#F44336";
      case "warning":
        return "#FF9800";
      case "info":
        return "#2196F3";
      default:
        return "#2196F3";
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <View style={themed($container)}>
      {messages.map((message, index) => {
        const animValue = animations[message.id] || new Animated.Value(1);

        return (
          <Animated.View
            key={message.id}
            style={[
              themed($toast),
              {
                backgroundColor: getToastColor(message.type),
                transform: [
                  {
                    translateY: animValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 0],
                    }),
                  },
                ],
                opacity: animValue,
                top: 60 + index * 80, // 여러 토스트가 겹치지 않도록
              },
            ]}
          >
            <Text style={themed($title)}>{message.title}</Text>
            <Text style={themed($message)}>{message.message}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const $container: ThemedStyle<any> = () => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 99999,
  pointerEvents: "none",
});

const $toast: ThemedStyle<any> = ({ spacing }) => ({
  position: "absolute",
  left: spacing.md,
  right: spacing.md,
  padding: spacing.md,
  borderRadius: 8,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
});

const $title: ThemedStyle<any> = () => ({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 4,
});

const $message: ThemedStyle<any> = () => ({
  color: "white",
  fontSize: 14,
});
