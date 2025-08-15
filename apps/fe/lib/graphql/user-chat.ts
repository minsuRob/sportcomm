import { gql } from "@apollo/client";

// === 사용자 채팅방 관련 GraphQL ===

// 사용자가 접근 가능한 채팅방 목록 조회 (팀 채팅방 + 공용 채팅방)
export const GET_USER_CHAT_ROOMS = gql`
  query GetUserChatRooms($page: Int = 1, $limit: Int = 20) {
    getUserChatRooms(page: $page, limit: $limit) {
      chatRooms {
        id
        name
        description
        type
        isRoomActive
        maxParticipants
        currentParticipants
        totalMessages
        teamId
        team {
          id
          name
          color
          icon
        }
        lastMessageContent
        lastMessageAt
        createdAt
        participants {
          id
          nickname
          profileImageUrl
        }
      }
      total
      page
      limit
      totalPages
    }
  }
`;

// 공용 채팅방 목록 조회 (모든 사용자 접근 가능)
export const GET_PUBLIC_CHAT_ROOMS = gql`
  query GetPublicChatRooms($page: Int = 1, $limit: Int = 20) {
    getPublicChatRooms(page: $page, limit: $limit) {
      chatRooms {
        id
        name
        description
        type
        isRoomActive
        maxParticipants
        currentParticipants
        totalMessages
        lastMessageContent
        lastMessageAt
        createdAt
        participants {
          id
          nickname
          profileImageUrl
        }
      }
      total
      page
      limit
      totalPages
    }
  }
`;

// 특정 팀의 채팅방 목록 조회
export const GET_TEAM_CHAT_ROOMS = gql`
  query GetTeamChatRooms($teamId: String!, $page: Int = 1, $limit: Int = 20) {
    getTeamChatRooms(teamId: $teamId, page: $page, limit: $limit) {
      chatRooms {
        id
        name
        description
        type
        isRoomActive
        maxParticipants
        currentParticipants
        totalMessages
        teamId
        team {
          id
          name
          color
          icon
        }
        lastMessageContent
        lastMessageAt
        createdAt
        participants {
          id
          nickname
          profileImageUrl
        }
      }
      total
      page
      limit
      totalPages
    }
  }
`;

// 채팅방 상세 정보 조회 (접근 권한 확인 포함)
export const GET_CHAT_ROOM = gql`
  query GetChatRoom($roomId: String!) {
    getChatRoom(roomId: $roomId) {
      id
      name
      description
      type
      isRoomActive
      maxParticipants
      currentParticipants
      totalMessages
      teamId
      team {
        id
        name
        color
        icon
      }
      lastMessageContent
      lastMessageAt
      createdAt
      participants {
        id
        nickname
        profileImageUrl
      }
    }
  }
`;

// 채팅방 메시지 목록 조회 (접근 권한 확인 포함)
export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($roomId: String!, $page: Int = 1, $limit: Int = 50) {
    getChatMessages(roomId: $roomId, page: $page, limit: $limit) {
      messages {
        id
        content
        type
        isRead
        isEdited
        isPinned
        readAt
        editedAt
        attachmentUrl
        attachmentName
        attachmentSize
        reactionCount
        replyToMessageId
        authorId
        roomId
        createdAt
        updatedAt
        author {
          id
          nickname
          profileImageUrl
        }
        replyToMessage {
          id
          content
          author {
            nickname
          }
        }
      }
      total
      page
      limit
      totalPages
      chatRoom {
        id
        name
        team {
          id
          name
          color
        }
      }
    }
  }
`;

// 메시지 전송 (접근 권한 확인 포함)
export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage(
    $roomId: String!
    $content: String!
    $replyToMessageId: String
  ) {
    sendChatMessage(
      roomId: $roomId
      content: $content
      replyToMessageId: $replyToMessageId
    ) {
      id
      content
      type
      isRead
      isEdited
      isPinned
      readAt
      editedAt
      attachmentUrl
      attachmentName
      attachmentSize
      reactionCount
      replyToMessageId
      authorId
      roomId
      createdAt
      updatedAt
      author {
        id
        nickname
        profileImageUrl
      }
      replyToMessage {
        id
        content
        author {
          nickname
        }
      }
    }
  }
`;

// 채팅방 참여 (접근 권한 확인 포함)
export const JOIN_CHAT_ROOM = gql`
  mutation JoinChatRoom($roomId: String!) {
    joinChatRoom(roomId: $roomId)
  }
`;

// 채팅방 나가기
export const LEAVE_CHAT_ROOM = gql`
  mutation LeaveChatRoom($roomId: String!) {
    leaveChatRoom(roomId: $roomId)
  }
`;

// 사용자의 팀 목록 조회 (채팅방 필터링용)
export const GET_USER_TEAMS_FOR_CHAT = gql`
  query GetUserTeamsForChat {
    getUserTeamsForChat {
      id
      userId
      teamId
      priority
      notificationEnabled
      createdAt
      user {
        id
        nickname
      }
      team {
        id
        name
        color
        icon
      }
    }
  }
`;

// === 타입 정의 ===

export interface UserChatRoom {
  id: string;
  name: string;
  description?: string;
  type: "PRIVATE" | "GROUP" | "PUBLIC";
  isRoomActive: boolean;
  maxParticipants: number;
  currentParticipants: number;
  totalMessages: number;
  teamId?: string;
  team?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  lastMessageContent?: string;
  lastMessageAt?: string;
  createdAt: string;
  participants: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  }[];
}

export interface ChatMessage {
  id: string;
  content: string;
  type: "TEXT" | "IMAGE" | "VIDEO" | "FILE" | "SYSTEM";
  isRead: boolean;
  isEdited: boolean;
  isPinned: boolean;
  readAt?: string;
  editedAt?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  reactionCount: number;
  replyToMessageId?: string;
  authorId: string;
  roomId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    nickname: string;
    profileImageUrl?: string;
  };
  replyToMessage?: {
    id: string;
    content: string;
    author: {
      nickname: string;
    };
  };
}

export interface UserChatRoomsResponse {
  getUserChatRooms: {
    chatRooms: UserChatRoom[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PublicChatRoomsResponse {
  getPublicChatRooms: {
    chatRooms: UserChatRoom[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TeamChatRoomsResponse {
  getTeamChatRooms: {
    chatRooms: UserChatRoom[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ChatRoomResponse {
  getChatRoom: UserChatRoom;
}

export interface ChatMessagesResponse {
  getChatMessages: {
    messages: ChatMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    chatRoom: {
      id: string;
      name: string;
      team?: {
        id: string;
        name: string;
        color: string;
      };
    };
  };
}

export interface SendMessageResponse {
  sendChatMessage: ChatMessage;
}

export interface JoinChatRoomResponse {
  joinChatRoom: boolean;
}

export interface LeaveChatRoomResponse {
  leaveChatRoom: boolean;
}

export interface UserTeamsForChatResponse {
  getUserTeamsForChat: {
    id: string;
    userId: string;
    teamId: string;
    priority: number;
    notificationEnabled: boolean;
    createdAt: string;
    user: {
      id: string;
      nickname: string;
    };
    team: {
      id: string;
      name: string;
      color: string;
      icon: string;
    };
  }[];
}
