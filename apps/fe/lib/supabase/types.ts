/**
 * Supabase 관련 타입 정의
 *
 * 인증, 데이터베이스, 실시간 기능에 사용되는 타입들을 정의합니다.
 */

import type { AuthError, Session, User } from "@supabase/supabase-js";

/**
 * 사용자 역할 타입
 */
export type UserRole = "USER" | "INFLUENCER" | "ADMIN";

/**
 * 게시물 타입
 */
export type PostType = "ANALYSIS" | "CHEERING" | "HIGHLIGHT";

/**
 * 확장된 사용자 프로필 타입
 */
export interface UserProfile {
  id: string;
  nickname: string;
  email: string;
  role: UserRole;
  profileImageUrl?: string;
  bio?: string;
  team?: string;
  isPrivate?: boolean;
  createdAt: string;
  updatedAt: string;
  myTeams?: UserTeam[];
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  isFollowing?: boolean;
}

/**
 * 사용자 팀 관계 타입
 */
export interface UserTeam {
  id: string;
  userId: string;
  teamId: string;
  priority: number;
  notificationEnabled: boolean;
  createdAt: string;
  team: Team;
}

/**
 * 팀 타입
 */
export interface Team {
  id: string;
  name: string;
  code: string;
  color: string;
  icon?: string;
  logoUrl?: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * 게시물 타입
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  type: PostType;
  teamId?: string;
  authorId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isPinned: boolean;
  isPublic: boolean;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt: string;
  author: UserProfile;
  team?: Team;
  media?: Media[];
  comments?: Comment[];
}

/**
 * 미디어 타입
 */
export interface Media {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  originalName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

/**
 * 댓글 타입
 */
export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  author: UserProfile;
  replies?: Comment[];
}

/**
 * 팔로우 관계 타입
 */
export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
  follower: UserProfile;
  following: UserProfile;
}

/**
 * 알림 타입
 */
export interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW" | "MENTION" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  userId: string;
  senderId?: string;
  postId?: string;
  commentId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  sender?: UserProfile;
  post?: Post;
  comment?: Comment;
}

/**
 * 채팅 채널 타입
 */
export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type: "GENERAL" | "TEAM" | "DIRECT" | "ANNOUNCEMENT";
  isRoomActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  members: ChatChannelMember[];
  unreadCount?: number;
}

/**
 * 채팅 채널 멤버 타입
 */
export interface ChatChannelMember {
  id: string;
  channelId: string;
  userId: string;
  isAdmin: boolean;
  joinedAt: string;
  lastReadAt?: string;
  isActive: boolean;
  user: UserProfile;
}

/**
 * 채팅 메시지 타입
 */
export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  replyToId?: string;
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserProfile;
  replyTo?: ChatMessage;
}

/**
 * 인증 관련 타입
 */
export interface AuthResult {
  user: UserProfile | null;
  session: Session | null;
  error: AuthError | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  confirmPassword?: string;
}

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

/**
 * 페이지네이션 타입
 */
export interface PaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

/**
 * 검색 필터 타입
 */
export interface PostFilter {
  type?: PostType;
  teamId?: string;
  authorId?: string;
  isPublic?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * 파일 업로드 타입
 */
export interface FileUploadResult {
  id: string;
  originalName: string;
  url: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * 실시간 이벤트 타입
 */
export interface RealtimeEvent<T = any> {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: T;
  old_record?: T;
}

/**
 * 데이터베이스 테이블 타입 (Supabase 생성)
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<UserProfile, "id">>;
      };
      posts: {
        Row: Post;
        Insert: Omit<
          Post,
          | "id"
          | "createdAt"
          | "updatedAt"
          | "viewCount"
          | "likeCount"
          | "commentCount"
          | "shareCount"
        >;
        Update: Partial<Omit<Post, "id" | "authorId">>;
      };
      comments: {
        Row: Comment;
        Insert: Omit<Comment, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Omit<Comment, "id" | "postId" | "authorId">>;
      };
      follows: {
        Row: Follow;
        Insert: Omit<Follow, "id" | "createdAt">;
        Update: never;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "createdAt">;
        Update: Partial<Pick<Notification, "isRead">>;
      };
      chat_channels: {
        Row: ChatChannel;
        Insert: Omit<
          ChatChannel,
          "id" | "createdAt" | "updatedAt" | "currentParticipants"
        >;
        Update: Partial<Omit<ChatChannel, "id" | "createdBy">>;
      };
      chat_channel_members: {
        Row: ChatChannelMember;
        Insert: Omit<ChatChannelMember, "id" | "joinedAt">;
        Update: Partial<Omit<ChatChannelMember, "id" | "channelId" | "userId">>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "createdAt" | "updatedAt">;
        Update: Partial<Pick<ChatMessage, "content" | "isDeleted">>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      post_type: PostType;
    };
  };
}

// 편의를 위한 타입 별칭
export type SupabaseUser = User;
export type SupabaseSession = Session;
export type SupabaseAuthError = AuthError;
