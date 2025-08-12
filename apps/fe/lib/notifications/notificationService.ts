/**
 * 알림 서비스
 *
 * 알림 관련 API 호출 및 로컬 상태 관리를 담당합니다.
 */

import {
  Notification,
  NotificationType,
} from "@/components/notifications/NotificationItem";
import { getSession } from "@/lib/auth";
import {
  GET_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
  MARK_NOTIFICATION_AS_READ,
  MARK_ALL_NOTIFICATIONS_AS_READ,
} from "@/lib/graphql";
import { ApolloClient, InMemoryCache } from "@apollo/client";

/**
 * 알림 서비스 설정
 */
const NOTIFICATION_CONFIG = {
  // USE_LOCAL_MODE: false, // 이 옵션은 더 이상 사용하지 않음
  MAX_NOTIFICATIONS: 50, // 최대 알림 개수
  REFRESH_INTERVAL: 30000, // 30초마다 새 알림 확인
};

/**
 * 알림 서비스 클래스
 */
class NotificationService {
  private notifications: Notification[] = [];
  // private isLocalMode: boolean = NOTIFICATION_CONFIG.USE_LOCAL_MODE;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private apolloClient: ApolloClient<any> | null = null;
  private lastCheckTime: string | null = null; // 마지막 알림 확인 시점
  private newNotificationListeners: Array<
    (notification: Notification) => void
  > = []; // 신규 알림 리스너

  /**
   * Apollo Client 설정
   */
  setApolloClient(client: ApolloClient<any>) {
    this.apolloClient = client;
  }

  /**
   * 서비스 초기화
   */
  async initialize() {
    // SSR 환경에서는 초기화를 건너뜀
    if (typeof window === "undefined") {
      console.log("알림 서비스 초기화 건너뜀 - SSR 환경");
      return;
    }

    // 마지막 확인 시점 로드
    await this.loadLastCheckTime();

    /*
     * "백엔드와 연결 필요"
     *
     * 앱이 시작될 때, 로그인된 사용자의 알림 목록을 백엔드 서버로부터 가져옵니다.
     * Apollo Client를 사용하여 GraphQL 쿼리를 실행합니다.
     */
    console.log("알림 서비스 초기화 - 서버 모드");
    await this.fetchNotificationsFromServer();

    // 주기적으로 새 알림 확인
    this.startPeriodicRefresh();
  }

  /**
   * 알림 목록 가져오기
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20
  ): Promise<Notification[]> {
    // 항상 서버에서 실제 데이터를 가져옵니다.
    return await this.fetchNotificationsFromServer(page, limit);
  }

  /**
   * 읽지 않은 알림 개수 가져오기
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  /**
   * 개별 알림 읽음 처리
   */
  async markAsRead(notificationId: string): Promise<void> {
    // 서버에 읽음 상태 업데이트를 요청하고, 성공하면 로컬 상태도 업데이트합니다.
    await this.markAsReadOnServer(notificationId);
    this.notifications = this.notifications.map((notification) =>
      notification.id === notificationId
        ? { ...notification, isRead: true }
        : notification
    );
    this.notifyListeners();
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(): Promise<void> {
    // 서버에 모든 알림 읽음 상태 업데이트를 요청하고, 성공하면 로컬 상태도 업데이트합니다.
    await this.markAllAsReadOnServer();
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      isRead: true,
    }));
    this.notifyListeners();
  }

  /**
   * 새 알림 추가 (시뮬레이션용)
   */
  // 로컬에서 직접 알림을 추가하는 기능은 사용하지 않으므로 주석 처리합니다.
  // 모든 알림은 서버로부터 받아야 합니다.
  // addNotification(notification: Omit<Notification, "id" | "createdAt">): void {
  //   ...
  // }

  /**
   * 알림 변경 리스너 등록
   */
  addListener(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);

    // 언마운트 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 신규 알림 리스너 등록
   */
  addNewNotificationListener(
    listener: (notification: Notification) => void
  ): () => void {
    this.newNotificationListeners.push(listener);

    // 언마운트 함수 반환
    return () => {
      this.newNotificationListeners = this.newNotificationListeners.filter(
        (l) => l !== listener
      );
    };
  }

  /**
   * 서비스 정리
   */
  cleanup(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.listeners = [];
  }

  // --- Private Methods ---

  /**
   * 개발용 임시 알림 데이터 생성
   */
  // 목 데이터 생성 함수는 더 이상 사용하지 않으므로 삭제합니다.
  // private generateMockNotifications(): Notification[] { ... }

  /**
   * 서버에서 알림 목록 가져오기
   */
  private async fetchNotificationsFromServer(
    page: number = 1,
    limit: number = 20
  ): Promise<Notification[]> {
    try {
      const { user } = await getSession();
      if (!user || !this.apolloClient) {
        throw new Error(
          "인증이 필요하거나 Apollo Client가 설정되지 않았습니다"
        );
      }

      const { data } = await this.apolloClient.query({
        query: GET_NOTIFICATIONS,
        variables: { page, limit },
        fetchPolicy: "network-only", // 항상 최신 데이터 가져오기
      });

      const notifications = data?.notifications?.notifications || [];

      // 첫 페이지인 경우 전체 알림 목록 업데이트 및 신규 알림 확인
      if (page === 1) {
        await this.checkForNewNotifications(notifications);
        this.notifications = notifications;
        this.notifyListeners();

        // 현재 시점을 마지막 확인 시점으로 저장
        await this.saveLastCheckTime();
      }

      return notifications;
    } catch (error) {
      console.error("서버에서 알림 가져오기 실패:", error);
      return [];
    }
  }

  /**
   * 서버에서 알림 읽음 처리
   */
  private async markAsReadOnServer(notificationId: string): Promise<void> {
    try {
      const { user } = await getSession();
      if (!user || !this.apolloClient) {
        throw new Error(
          "인증이 필요하거나 Apollo Client가 설정되지 않았습니다"
        );
      }

      await this.apolloClient.mutate({
        mutation: MARK_NOTIFICATION_AS_READ,
        variables: { notificationId },
      });
    } catch (error) {
      console.error("알림 읽음 처리 실패:", error);
      throw error;
    }
  }

  /**
   * 서버에서 모든 알림 읽음 처리
   */
  private async markAllAsReadOnServer(): Promise<void> {
    try {
      const { user } = await getSession();
      if (!user || !this.apolloClient) {
        throw new Error(
          "인증이 필요하거나 Apollo Client가 설정되지 않았습니다"
        );
      }

      await this.apolloClient.mutate({
        mutation: MARK_ALL_NOTIFICATIONS_AS_READ,
      });
    } catch (error) {
      console.error("모든 알림 읽음 처리 실패:", error);
      throw error;
    }
  }

  /**
   * 주기적으로 새 알림 확인
   */
  private startPeriodicRefresh(): void {
    /*
     * "백엔드와 연결 필요"
     *
     * 주기적으로 새로운 알림이 있는지 서버에 확인하는 로직입니다.
     * 현재는 비활성화되어 있으며, 실시간 업데이트는 WebSocket 구독으로 처리하는 것이
     * 더 효율적일 수 있습니다. 필요시 이 로직을 활성화하거나 수정하세요.
     */
    // this.refreshTimer = setInterval(async () => {
    //   await this.fetchNotificationsFromServer();
    // }, NOTIFICATION_CONFIG.REFRESH_INTERVAL);
  }

  /**
   * 새 알림 시뮬레이션
   */
  // 로컬 시뮬레이션 함수는 더 이상 사용하지 않으므로 삭제합니다.
  // private simulateNewNotification(): void { ... }

  /**
   * 신규 알림 확인 및 토스트 표시
   */
  private async checkForNewNotifications(
    notifications: Notification[]
  ): Promise<void> {
    if (!this.lastCheckTime) {
      // 첫 실행이면 신규 알림으로 간주하지 않음
      return;
    }

    const lastCheckDate = new Date(this.lastCheckTime);
    const newNotifications = notifications.filter((notification) => {
      const notificationDate = new Date(notification.createdAt);
      return notificationDate > lastCheckDate && !notification.isRead;
    });

    // 신규 알림이 있으면 리스너들에게 알림
    newNotifications.forEach((notification) => {
      this.notifyNewNotificationListeners(notification);
    });
  }

  /**
   * 마지막 확인 시점 로드
   */
  private async loadLastCheckTime(): Promise<void> {
    try {
      // SSR 환경에서는 건너뜀
      if (typeof window === "undefined") {
        console.log("마지막 확인 시점 로드 건너뜀 - SSR 환경");
        return;
      }

      // 웹 환경에서는 localStorage 사용
      if (typeof localStorage !== "undefined") {
        this.lastCheckTime = localStorage.getItem(
          "notification_last_check_time"
        );
      } else {
        // React Native 환경에서는 AsyncStorage 사용
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        this.lastCheckTime = await AsyncStorage.getItem(
          "notification_last_check_time"
        );
      }
    } catch (error) {
      console.warn("마지막 확인 시점 로드 실패:", error);
      this.lastCheckTime = null;
    }
  }

  /**
   * 마지막 확인 시점 저장
   */
  private async saveLastCheckTime(): Promise<void> {
    try {
      const currentTime = new Date().toISOString();
      this.lastCheckTime = currentTime;

      // React Native 환경에서는 AsyncStorage 사용
      if (typeof window === "undefined") {
        const AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem("notification_last_check_time", currentTime);
      } else {
        // 웹 환경에서는 localStorage 사용
        localStorage.setItem("notification_last_check_time", currentTime);
      }
    } catch (error) {
      console.warn("마지막 확인 시점 저장 실패:", error);
    }
  }

  /**
   * 신규 알림 리스너들에게 알림
   */
  private notifyNewNotificationListeners(notification: Notification): void {
    this.newNotificationListeners.forEach((listener) => {
      listener(notification);
    });
  }

  /**
   * 리스너들에게 변경 사항 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener([...this.notifications]);
    });
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const notificationService = new NotificationService();

// 서비스 초기화
notificationService.initialize();

console.log("알림 서비스가 초기화되었습니다.");
