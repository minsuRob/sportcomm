import { useCallback, useEffect, useState } from "react";

export interface ChatRoomSummary {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type?: string;
  isRoomActive?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  members?: any[];
  createdAt?: string;
}

interface UseChatRoomsOptions {
  autoLoad?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Supabase 공개 채팅방 목록을 가져오는 훅
 * - UI 토스트는 호출 측에서 처리할 수 있도록 에러만 노출합니다.
 */
export function useChatRooms(options: UseChatRoomsOptions = {}) {
  const { autoLoad = true, page = 1, limit = 20 } = options;
  const [chatRooms, setChatRooms] = useState<ChatRoomSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const loadChatRooms = useCallback(async () => {
    try {
      setIsLoading(true);
      setLastError(null);
      const { chatService } = await import("@/lib/chat/chatService");
      const result = await chatService.getPublicChatRooms(page, limit);
      const transformed = result.chatRooms.map((room: any) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        isPrivate: room.isPrivate,
        type: room.type,
        isRoomActive: room.isRoomActive,
        maxParticipants: room.maxParticipants,
        currentParticipants: room.currentParticipants,
        lastMessage: room.lastMessage,
        lastMessageAt: room.lastMessageAt,
        unreadCount: 0,
        members: room.members,
        createdAt: room.createdAt,
      })) as ChatRoomSummary[];
      setChatRooms(transformed);
    } catch (err) {
      const errorObj = err as Error;
      setChatRooms([]);
      setLastError(errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    if (autoLoad) {
      void loadChatRooms();
    }
  }, [autoLoad, loadChatRooms]);

  return { chatRooms, isLoading, loadChatRooms, lastError } as const;
}

export default useChatRooms;
