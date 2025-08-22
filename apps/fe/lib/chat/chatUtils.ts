/**
 * 채팅 관련 유틸리티 함수들
 */

/**
 * 채팅방 정보 타입
 */
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type?: "PRIVATE" | "GROUP" | "PUBLIC";
  isRoomActive?: boolean;
  maxParticipants?: number;
  currentParticipants?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  members: {
    userId: string;
    user: {
      id: string;
      nickname: string;
      profileImageUrl?: string;
    };
    isAdmin: boolean;
    joinedAt: string;
    lastReadAt: string;
  }[];
  createdAt: string;
  team?: {
    id: string;
    name: string;
    color: string;
    icon: string;
    logoUrl?: string;
  };
}

/**
 * 채팅방 타입 정보
 */
export interface RoomTypeInfo {
  icon: string;
  color: string;
  label: string;
  teamIcon?: string;
}

/**
 * 날짜 포맷팅 함수
 */
export const formatChatDate = (dateString?: string): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
};

/**
 * 채팅방 타입별 아이콘 및 색상 반환
 */
export const getRoomTypeInfo = (
  room: ChatRoom,
  tintColor: string,
): RoomTypeInfo => {
  // 팀 채팅방인 경우 팀 색상 사용
  if (room.team) {
    return {
      icon: "people-outline",
      color: room.team.color,
      label: room.team.name,
      teamIcon: room.team.icon,
    };
  }

  // 공용 채팅방인 경우
  if (room.type) {
    switch (room.type) {
      case "PUBLIC":
        return { icon: "globe-outline", color: "#3B82F6", label: "공용" };
      case "GROUP":
        return { icon: "people-outline", color: "#10B981", label: "그룹" };
      case "PRIVATE":
        return {
          icon: "person-outline",
          color: "#8B5CF6",
          label: "개인",
        };
      default:
        return {
          icon: "chatbubbles-outline",
          color: tintColor,
          label: "채팅",
        };
    }
  }

  // 기존 채팅방 (isPrivate 기반)
  return {
    icon: room.isPrivate ? "person" : "chatbubbles",
    color: tintColor,
    label: room.isPrivate ? "개인" : "채팅",
  };
};

/**
 * 1대1 채팅방 이름 생성
 */
export const generatePrivateChatName = (
  user1: string,
  user2: string,
): string => {
  const names = [user1, user2].sort();
  return `${names[0]} & ${names[1]}`;
};

/**
 * 1대1 채팅방에서 상대방 이름 추출
 */
export const getPrivateChatPartnerName = (
  chatRoomName: string,
  currentUserName: string,
): string => {
  if (chatRoomName.includes(" & ")) {
    const names = chatRoomName.split(" & ");
    return names.find((name) => name !== currentUserName) || chatRoomName;
  }
  return chatRoomName;
};

/**
 * 채팅방이 1대1 개인 채팅인지 확인
 */
export const isPrivateChat = (room: ChatRoom): boolean => {
  return room.type === "PRIVATE" && room.maxParticipants === 2;
};

/**
 * 채팅방 표시명 반환 (1대1 채팅의 경우 상대방 이름)
 */
export const getChatRoomDisplayName = (
  room: ChatRoom,
  currentUserName?: string,
): string => {
  if (isPrivateChat(room) && currentUserName) {
    return getPrivateChatPartnerName(room.name, currentUserName);
  }
  return room.name;
};

/**
 * 멤버 수 계산
 */
export const getMemberCount = (room: ChatRoom): number => {
  return room.currentParticipants || room.members.length;
};

/**
 * 읽지 않은 메시지 여부 확인
 */
export const hasUnreadMessages = (room: ChatRoom): boolean => {
  return room.unreadCount > 0;
};

/**
 * 읽지 않은 메시지 수 포맷팅
 */
export const formatUnreadCount = (count: number): string => {
  return count > 99 ? "99+" : count.toString();
};
