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
  USE_LOCAL_MODE: false, // 백엔드 연동 모드로 변경
  MAX_NOTIFICATIONS: 50, // 최대 알림 개수
  REFRESH_INTERVAL: 30000, // 30초마다 새 알림 확인
};

/**
 * 알림 서비스 클래스
 */
class NotificationService {
  private notifications: Notification[] = [];
  private isLocalMode: boolean = NOTIFICATION_CONFIG.USE_LOCAL_MODE;
  private refreshTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private apolloClient: ApolloClient<any> | null = null;

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
    if (this.isLocalMode) {
      console.log("알림 서비스 초기화 - 로컬 모드");
      this.notifications = this.generateMockNotifications();
    } else {
      console.log("알림 서비스 초기화 - 서버 모드");
      await this.fetchNotificationsFromServer();
    }

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
    if (this.isLocalMode) {
      // 로컬 모드: 페이지네이션 시뮬레이션
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      return this.notifications.slice(startIndex, endIndex);
    } else {
      // 서버 모드: 실제 API 호출
      return await this.fetchNotificationsFromServer(page, limit);
    }
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
    if (this.isLocalMode) {
      // 로컬 모드: 메모리에서 업데이트
      this.notifications = this.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      );
      this.notifyListeners();
    } else {
      // 서버 모드: API 호출
      await this.markAsReadOnServer(notificationId);
    }
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(): Promise<void> {
    if (this.isLocalMode) {
      // 로컬 모드: 메모리에서 업데이트
      this.notifications = this.notifications.map((notification) => ({
        ...notification,
        isRead: true,
      }));
      this.notifyListeners();
    } else {
      // 서버 모드: API 호출
      await this.markAllAsReadOnServer();
    }
  }

  /**
   * 새 알림 추가 (시뮬레이션용)
   */
  addNotification(notification: Omit<Notification, "id" | "createdAt">): void {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.notifications.unshift(newNotification);

    // 최대 개수 제한
    if (this.notifications.length > NOTIFICATION_CONFIG.MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(
        0,
        NOTIFICATION_CONFIG.MAX_NOTIFICATIONS
      );
    }

    this.notifyListeners();
  }

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
  private generateMockNotifications(): Notification[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return [
      {
        id: "notif-1",
        type: NotificationType.LIKE,
        title: "새로운 좋아요",
        message: "축구팬123님이 회원님의 게시물을 좋아합니다.",
        createdAt: oneHourAgo.toISOString(),
        isRead: false,
        user: {
          id: "user-1",
          nickname: "축구팬123",
          profileImageUrl: "https://i.pravatar.cc/150?u=user1",
        },
        post: {
          id: "post-1",
          content: "오늘 경기 정말 흥미진진했어요!",
        },
      },
      {
        id: "notif-2",
        type: NotificationType.COMMENT,
        title: "새로운 댓글",
        message:
          '스포츠매니아님이 회원님의 게시물에 댓글을 남겼습니다: "정말 좋은 분석이네요!"',
        createdAt: oneHourAgo.toISOString(),
        isRead: false,
        user: {
          id: "user-2",
          nickname: "스포츠매니아",
          profileImageUrl: "https://i.pravatar.cc/150?u=user2",
        },
        post: {
          id: "post-2",
          content: "프리미어리그 분석",
        },
      },
      {
        id: "notif-3",
        type: NotificationType.FOLLOW,
        title: "새로운 팔로워",
        message: "경기분석가님이 회원님을 팔로우하기 시작했습니다.",
        createdAt: threeDaysAgo.toISOString(),
        isRead: true,
        user: {
          id: "user-3",
          nickname: "경기분석가",
          profileImageUrl: "https://i.pravatar.cc/150?u=user3",
        },
      },
      {
        id: "notif-4",
        type: NotificationType.SYSTEM,
        title: "새로운 기능 출시",
        message:
          "이제 GIF 파일도 업로드할 수 있습니다! 더 생생한 스포츠 순간을 공유해보세요.",
        createdAt: oneWeekAgo.toISOString(),
        isRead: true,
      },
    ];
  }

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

      // 첫 페이지인 경우 전체 알림 목록 업데이트
      if (page === 1) {
        this.notifications = notifications;
        this.notifyListeners();
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
    this.refreshTimer = setInterval(async () => {
      if (this.isLocalMode) {
        // 로컬 모드에서는 랜덤하게 새 알림 생성 (10% 확률)
        if (Math.random() < 0.1) {
          this.simulateNewNotification();
        }
      } else {
        // 서버 모드에서는 실제 새 알림 확인
        await this.fetchNotificationsFromServer();
      }
    }, NOTIFICATION_CONFIG.REFRESH_INTERVAL);
  }

  /**
   * 새 알림 시뮬레이션
   */
  private simulateNewNotification(): void {
    const mockNotifications = [
      {
        type: NotificationType.LIKE,
        title: "새로운 좋아요",
        message: "누군가가 회원님의 게시물을 좋아합니다.",
        isRead: false,
      },
      {
        type: NotificationType.COMMENT,
        title: "새로운 댓글",
        message: "회원님의 게시물에 새 댓글이 달렸습니다.",
        isRead: false,
      },
      {
        type: NotificationType.FOLLOW,
        title: "새로운 팔로워",
        message: "새로운 팔로워가 생겼습니다.",
        isRead: false,
      },
    ];

    const randomNotification =
      mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
    this.addNotification(randomNotification);
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
