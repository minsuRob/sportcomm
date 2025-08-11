import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { ApolloClient, gql } from "@apollo/client";

let initialized = false;

/**
 * 백엔드에 Expo Push Token 등록용 뮤테이션 (존재하지 않으면 무시)
 */
const REGISTER_PUSH_TOKEN = gql`
  mutation RegisterPushToken($token: String!, $device: String) {
    registerPushToken(token: $token, device: $device)
  }
`;

export interface InitOptions {
  apolloClient?: ApolloClient<any>;
  onToken?: (token: string) => void;
  onReceive?: (n: Notifications.Notification) => void;
  onResponse?: (r: Notifications.NotificationResponse) => void;
}

export async function requestPermissionsAsync(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenResponse.data || null;
  } catch (e) {
    console.warn("Expo push token fetch failed:", e);
    return null;
  }
}

async function registerTokenWithBackend(
  client: ApolloClient<any> | undefined,
  token: string
) {
  if (!client) return;
  try {
    await client.mutate({
      mutation: REGISTER_PUSH_TOKEN,
      variables: { token, device: Platform.OS },
    });
  } catch (e) {
    // 백엔드에 아직 스키마가 없을 수 있으므로 경고만 남김
    console.warn(
      "registerPushToken backend call skipped:",
      (e as any)?.message || e
    );
  }
}

export async function initExpoNotifications(
  options: InitOptions = {}
): Promise<void> {
  if (initialized) return;
  initialized = true;

  // 알림 표시 기본 핸들러
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // 안드로이드 채널 설정
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const granted = await requestPermissionsAsync();
  if (!granted) {
    console.warn("Notifications permission not granted");
    return;
  }

  const token = await getExpoPushToken();
  if (token) {
    options.onToken?.(token);
    await registerTokenWithBackend(options.apolloClient, token);
  }

  // 수신 리스너
  Notifications.addNotificationReceivedListener((notification) => {
    options.onReceive?.(notification);
  });

  // 클릭 응답 리스너
  Notifications.addNotificationResponseReceivedListener((response) => {
    options.onResponse?.(response);
  });
}

/** 로컬 알림 테스트용 헬퍼 */
export async function scheduleLocal(title: string, body: string) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
