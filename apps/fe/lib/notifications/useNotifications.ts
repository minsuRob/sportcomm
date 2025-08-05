/**
 * 알림 관련 React 훅
 *
 * 알림 상태 관리 및 UI 업데이트를 위한 커스텀 훅들을 제공합니다.
 */

import { useState, useEffect, useCallback } from "react";
import { Notification } from "@/components/notifications/NotificationItem";
import { notificationService } from "./notificationService";

/**
 * 알림 목록 관리 훅
 */
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  /**
   * 알림 목록 새로고침
   */
  const refreshNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const freshNotifications = await notificationService.getNotifications(
        1,
        20,
      );
      setNotifications(freshNotifications);
      setPage(1);
      setHasMore(freshNotifications.length === 20);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알림을 불러오는데 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 더 많은 알림 로드 (페이지네이션)
   */
  const loadMoreNotifications = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const moreNotifications = await notificationService.getNotifications(
        nextPage,
        20,
      );

      if (moreNotifications.length > 0) {
        setNotifications((prev) => [...prev, ...moreNotifications]);
        setPage(nextPage);
        setHasMore(moreNotifications.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "추가 알림을 불러오는데 실패했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, isLoading, hasMore]);

  /**
   * 개별 알림 읽음 처리
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);

      // 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알림 읽음 처리에 실패했습니다.",
      );
    }
  }, []);

  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // 로컬 상태 업데이트
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "모든 알림 읽음 처리에 실패했습니다.",
      );
    }
  }, []);

  // 컴포넌트 마운트 시 알림 목록 로드
  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  // 알림 서비스 리스너 등록
  useEffect(() => {
    const unsubscribe = notificationService.addListener(
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      },
    );

    return unsubscribe;
  }, []);

  return {
    notifications,
    isLoading,
    error,
    hasMore,
    refreshNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
  };
};

/**
 * 읽지 않은 알림 개수 관리 훅
 */
export const useUnreadNotificationCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // 초기 개수 설정
    setUnreadCount(notificationService.getUnreadCount());

    // 알림 변경 리스너 등록
    const unsubscribe = notificationService.addListener((notifications) => {
      const count = notifications.filter((n) => !n.isRead).length;
      setUnreadCount(count);
    });

    return unsubscribe;
  }, []);

  return unreadCount;
};

/**
 * 알림 권한 관리 훅 (푸시 알림용)
 */
export const useNotificationPermissions = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * 알림 권한 요청
   */
  const requestPermission = useCallback(async () => {
    setIsRequesting(true);

    try {
      // React Native의 경우
      if (typeof navigator !== "undefined" && "permissions" in navigator) {
        const permission = await navigator.permissions.query({
          name: "notifications" as any,
        });
        setHasPermission(permission.state === "granted");
      } else {
        // 웹의 경우
        if ("Notification" in window) {
          const permission = await Notification.requestPermission();
          setHasPermission(permission === "granted");
        } else {
          setHasPermission(false);
        }
      }
    } catch (error) {
      console.error("알림 권한 요청 실패:", error);
      setHasPermission(false);
    } finally {
      setIsRequesting(false);
    }
  }, []);

  /**
   * 현재 권한 상태 확인
   */
  const checkPermission = useCallback(async () => {
    try {
      if ("Notification" in window) {
        setHasPermission(Notification.permission === "granted");
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error("알림 권한 확인 실패:", error);
      setHasPermission(false);
    }
  }, []);

  // 컴포넌트 마운트 시 권한 상태 확인
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    checkPermission,
  };
};

/**
 * 신규 알림 토스트 표시 훅 (페이지 새로고침 시에만)
 */
export const useNewNotificationToast = () => {
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // 신규 알림 리스너 등록
    const unsubscribe = notificationService.addNewNotificationListener(
      (notification) => {
        setLatestNotification(notification);
        setShowToast(true);

        // 4초 후 토스트 자동 숨김
        setTimeout(() => {
          setShowToast(false);
        }, 4000);
      },
    );

    return unsubscribe;
  }, []);

  /**
   * 토스트 수동 닫기
   */
  const dismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return {
    latestNotification,
    showToast,
    dismissToast,
  };
};

/**
 * 실시간 알림 표시 훅 (기존 호환성 유지)
 * @deprecated useNewNotificationToast를 사용하세요
 */
export const useRealtimeNotifications = () => {
  return useNewNotificationToast();
};
