import { gql } from "@apollo/client";

// === 채팅 관련 GraphQL ===

export const GET_CHAT_ROOMS = gql`
  query GetChatRooms {
    chatChannels {
      id
      name
      description
      isPrivate
      type
      isRoomActive
      maxParticipants
      currentParticipants
      lastMessage
      lastMessageAt
      unreadCount
      members {
        userId
        user {
          id
          nickname
          profileImageUrl
        }
        isAdmin
        joinedAt
        lastReadAt
      }
      createdAt
    }
  }
`;

export const GET_CHAT_MESSAGES = gql`
  query GetChatMessages($filter: GetMessagesFilter!) {
    chatMessages(filter: $filter) {
      id
      channelId
      userId
      user {
        id
        nickname
        profileImageUrl
      }
      content
      createdAt
      replyTo {
        id
        content
        user {
          nickname
        }
      }
      isSystem
      attachments {
        id
        fileUrl
        fileType
        fileName
        fileSize
      }
    }
  }
`;

export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($input: SendChatMessageInput!) {
    sendChatMessage(input: $input) {
      message {
        id
        channelId
        userId
        user {
          id
          nickname
          profileImageUrl
        }
        content
        createdAt
        replyTo {
          id
          content
          user {
            nickname
          }
        }
        isSystem
      }
    }
  }
`;

export const CREATE_CHAT_CHANNEL = gql`
  mutation CreateChatChannel($input: CreateChatChannelInput!) {
    createChatChannel(input: $input) {
      channel {
        id
        name
        description
        isPrivate
        members {
          userId
          user {
            id
            nickname
            profileImageUrl
          }
          isAdmin
          joinedAt
        }
        createdAt
      }
    }
  }
`;

export const JOIN_CHAT_CHANNEL = gql`
  mutation JoinChatChannel($channelId: ID!) {
    addChatChannelMembers(input: { channelId: $channelId, userIds: [] }) {
      success
      channel {
        id
        name
        members {
          userId
          user {
            id
            nickname
          }
        }
      }
    }
  }
`;

export const LEAVE_CHAT_CHANNEL = gql`
  mutation LeaveChatChannel($channelId: ID!) {
    leaveChatChannel(channelId: $channelId)
  }
`;

export const MARK_CHANNEL_AS_READ = gql`
  mutation MarkChannelAsRead($channelId: ID!) {
    markChannelAsRead(channelId: $channelId)
  }
`;

// === 구독 (실시간) ===

export const ON_NEW_CHAT_MESSAGE = gql`
  subscription OnNewChatMessage($channelId: ID!) {
    onNewChatMessage(channelId: $channelId) {
      id
      channelId
      userId
      user {
        id
        nickname
        profileImageUrl
      }
      content
      createdAt
      replyTo {
        id
        content
        user {
          nickname
        }
      }
      isSystem
    }
  }
`;

export const ON_CHAT_CHANNEL_UPDATED = gql`
  subscription OnChatChannelUpdated($channelId: ID!) {
    onChatChannelUpdated(channelId: $channelId) {
      id
      name
      description
      lastMessage
      lastMessageAt
      unreadCount
    }
  }
`;
