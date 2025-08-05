import { supabase, handleSupabaseError, Database } from "./client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Message } from "../../components/chat/ChatList";
import { User } from "../auth";

// Supabase 데이터베이스 타입 정의
type ChatChannel = Database["public"]["Tables"]["chat_channels"]["Row"];
type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
type ChatChannelMember =
  Database["public"]["Tables"]["chat_channel_members"]["Row"];

// 채팅방 정보 인터페이스 (GraphQL 호환)
export interface ChannelInfo {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  type: string;
  isRoomActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  members: {
    userId: string;
    user: {
      id: string;
      nickname: string;
      profileImageUrl?: string;
    };
    isAdmin: boolean;
    joinedAt: string;
    lastReadAt?: string;
  }[];
  createdAt: string;
}

// 메시지 전송 입력 타입
export interface SendMessageInput {
  channelId: string;
  content: string;
  replyToId?: string;
}

// 채팅방 생성 입력 타입
export interface CreateChannelInput {
  name: string;
  description?: string;
  isPrivate?: boolean;
  type?: string;
  maxParticipants?: number;
}

/**
 * Supabase 기반 채팅 서비스 클래스
 *
 * 주요 기능:
 * - 채팅방 CRUD 작업
 * - 메시지 전송/수신
 * - 실시간 구독 관리
 * - 개발/프로덕션 모드 지원
 */
export class SupabaseChatService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.initializeConnection();
  }

  /**
   * Supabase 연결 초기화
   */
  private async initializeConnection() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      this.isConnected = !!session;
      console.log(
        "Supabase 채팅 서비스 초기화:",
        this.isConnected ? "성공" : "미인증 상태"
      );
    } catch (error) {
      console.error("Supabase 연결 초기화 실패:", error);
      this.isConnected = false;
    }
  }

  /**
   * 사용자 세션 설정
   * @param accessToken JWT 액세스 토큰
   * @param refreshToken JWT 리프레시 토큰
   */
  async setSession(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;
      this.isConnected = true;
      console.log("Supabase 세션 설정 완료");
    } catch (error) {
      handleSupabaseError(error, "세션 설정");
    }
  }

  /**
   * 사용자 채팅방 목록 조회
   * @returns 사용자가 참여한 채팅방 목록
   */
  async getUserChatRooms(): Promise<ChannelInfo[]> {
    try {
      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select(
          `
          *,
          chat_channel_members!inner (
            user_id,
            is_admin,
            joined_at,
            last_read_at,
            users (
              id,
              nickname,
              profile_image_url
            )
          )
        `
        )
        .eq(
          "chat_channel_members.user_id",
          (await supabase.auth.getUser()).data.user?.id
        )
        .eq("chat_channel_members.is_active", true)
        .order("last_message_at", { ascending: false });

      if (error) throw error;

      return this.transformChannelsToGraphQL(channels || []);
    } catch (error) {
      handleSupabaseError(error, "사용자 채팅방 목록 조회");
      return [];
    }
  }

  /**
   * 공개 채팅방 목록 조회
   * @param page 페이지 번호
   * @param limit 페이지당 항목 수
   * @returns 공개 채팅방 목록
   */
  async getPublicChatRooms(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    chatRooms: ChannelInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const offset = (page - 1) * limit;

      // 총 개수 조회
      const { count, error: countError } = await supabase
        .from("chat_channels")
        .select("*", { count: "exact", head: true })
        .eq("is_private", false)
        .eq("is_room_active", true);

      if (countError) throw countError;

      // 채팅방 목록 조회
      const { data: channels, error } = await supabase
        .from("chat_channels")
        .select(
          `
          *,
          chat_channel_members (
            user_id,
            is_admin,
            joined_at,
            last_read_at,
            users (
              id,
              nickname,
              profile_image_url
            )
          )
        `
        )
        .eq("is_private", false)
        .eq("is_room_active", true)
        .order("last_message_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        chatRooms: this.transformChannelsToGraphQL(channels || []),
        total: count || 0,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      handleSupabaseError(error, "공개 채팅방 목록 조회");
      return {
        chatRooms: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
  }

  /**
   * 채팅방 메시지 조회
   * @param channelId 채팅방 ID
   * @param limit 메시지 개수 제한
   * @param before 이전 메시지 기준 시간
   * @returns 메시지 목록
   */
  async getChatMessages(
    channelId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    try {
      let query = supabase
        .from("chat_messages")
        .select(
          `
          *,
          users (
            id,
            nickname,
            profile_image_url
          ),
          reply_to:chat_messages!reply_to_id (
            id,
            content,
            users (
              nickname
            )
          )
        `
        )
        .eq("channel_id", channelId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (before) {
        query = query.lt("created_at", before);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // 디버깅을 위한 로깅
      console.log(
        "Supabase 메시지 데이터:",
        JSON.stringify(messages?.[0], null, 2)
      );

      return this.transformMessagesToGraphQL(messages || []);
    } catch (error) {
      handleSupabaseError(error, "채팅 메시지 조회");
      return [];
    }
  }

  /**
   * 메시지 전송
   * @param input 메시지 전송 입력 데이터
   * @returns 전송된 메시지
   */
  async sendMessage(input: SendMessageInput): Promise<Message | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증되지 않은 사용자입니다.");

      const { data: message, error } = await supabase
        .from("chat_messages")
        .insert({
          channel_id: input.channelId,
          user_id: user.id,
          content: input.content,
          reply_to_id: input.replyToId || null,
        })
        .select(
          `
          *,
          users (
            id,
            nickname,
            profile_image_url
          ),
          reply_to:chat_messages!reply_to_id (
            id,
            content,
            users (
              nickname
            )
          )
        `
        )
        .single();

      if (error) throw error;

      return this.transformMessageToGraphQL(message);
    } catch (error) {
      handleSupabaseError(error, "메시지 전송");
      return null;
    }
  }

  /**
   * 채팅방 생성
   * @param input 채팅방 생성 입력 데이터
   * @returns 생성된 채팅방 정보
   */
  async createChatChannel(
    input: CreateChannelInput
  ): Promise<ChannelInfo | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증되지 않은 사용자입니다.");

      // 채팅방 생성
      const { data: channel, error: channelError } = await supabase
        .from("chat_channels")
        .insert({
          name: input.name,
          description: input.description || null,
          is_private: input.isPrivate || false,
          type: input.type || "GENERAL",
          max_participants: input.maxParticipants || 100,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // 생성자를 채팅방 관리자로 추가
      const { error: memberError } = await supabase
        .from("chat_channel_members")
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          is_admin: true,
        });

      if (memberError) throw memberError;

      // 생성된 채팅방 정보 조회
      const { data: fullChannel, error: fetchError } = await supabase
        .from("chat_channels")
        .select(
          `
          *,
          chat_channel_members (
            user_id,
            is_admin,
            joined_at,
            last_read_at,
            users (
              id,
              nickname,
              profile_image_url
            )
          )
        `
        )
        .eq("id", channel.id)
        .single();

      if (fetchError) throw fetchError;

      return this.transformChannelToGraphQL(fullChannel);
    } catch (error) {
      handleSupabaseError(error, "채팅방 생성");
      return null;
    }
  }

  /**
   * 채팅방 참여
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async joinChatChannel(channelId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증되지 않은 사용자입니다.");

      const { error } = await supabase.from("chat_channel_members").upsert({
        channel_id: channelId,
        user_id: user.id,
        is_active: true,
      });

      if (error) throw error;

      return true;
    } catch (error) {
      handleSupabaseError(error, "채팅방 참여");
      return false;
    }
  }

  /**
   * 채팅방 나가기
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async leaveChatChannel(channelId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증되지 않은 사용자입니다.");

      const { error } = await supabase
        .from("chat_channel_members")
        .update({ is_active: false })
        .eq("channel_id", channelId)
        .eq("user_id", user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      handleSupabaseError(error, "채팅방 나가기");
      return false;
    }
  }

  /**
   * 채팅방 읽음 처리
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async markChannelAsRead(channelId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증되지 않은 사용자입니다.");

      const { error } = await supabase
        .from("chat_channel_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", channelId)
        .eq("user_id", user.id);

      if (error) throw error;

      return true;
    } catch (error) {
      handleSupabaseError(error, "채팅방 읽음 처리");
      return false;
    }
  }

  /**
   * 실시간 메시지 구독
   * @param channelId 채팅방 ID
   * @param onMessage 새 메시지 수신 콜백
   * @returns 구독 해제 함수
   */
  subscribeToMessages(
    channelId: string,
    onMessage: (message: Message) => void
  ): () => void {
    const channelName = `chat_messages_${channelId}`;

    // 기존 구독 정리
    if (this.realtimeChannels.has(channelName)) {
      this.unsubscribeFromChannel(channelName);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          try {
            // 새 메시지 상세 정보 조회
            const { data: message, error } = await supabase
              .from("chat_messages")
              .select(
                `
                *,
                users (
                  id,
                  nickname,
                  profile_image_url
                ),
                reply_to:chat_messages!reply_to_id (
                  id,
                  content,
                  users (
                    nickname
                  )
                )
              `
              )
              .eq("id", payload.new.id)
              .single();

            if (!error && message) {
              const transformedMessage =
                this.transformMessageToGraphQL(message);
              onMessage(transformedMessage);
            }
          } catch (error) {
            console.error("실시간 메시지 처리 오류:", error);
          }
        }
      )
      .subscribe();

    this.realtimeChannels.set(channelName, channel);

    // 구독 해제 함수 반환
    return () => this.unsubscribeFromChannel(channelName);
  }

  /**
   * 채널 구독 해제
   * @param channelName 채널 이름
   */
  private unsubscribeFromChannel(channelName: string): void {
    const channel = this.realtimeChannels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.realtimeChannels.delete(channelName);
    }
  }

  /**
   * 모든 구독 정리
   */
  cleanup(): void {
    this.realtimeChannels.forEach((channel, channelName) => {
      this.unsubscribeFromChannel(channelName);
    });
  }

  /**
   * Supabase 채널 데이터를 GraphQL 형식으로 변환
   */
  private transformChannelsToGraphQL(channels: any[]): ChannelInfo[] {
    return channels.map((channel) => this.transformChannelToGraphQL(channel));
  }

  /**
   * Supabase 채널 데이터를 GraphQL 형식으로 변환 (단일)
   */
  private transformChannelToGraphQL(channel: any): ChannelInfo {
    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      isPrivate: channel.is_private,
      type: channel.type,
      isRoomActive: channel.is_room_active,
      maxParticipants: channel.max_participants,
      currentParticipants: channel.current_participants,
      lastMessage: channel.last_message,
      lastMessageAt: channel.last_message_at,
      members: (channel.chat_channel_members || []).map((member: any) => ({
        userId: member.user_id,
        user: {
          id: member.users.id,
          nickname: member.users.nickname,
          profileImageUrl: member.users.profile_image_url,
        },
        isAdmin: member.is_admin,
        joinedAt: member.joined_at,
        lastReadAt: member.last_read_at,
      })),
      createdAt: channel.created_at,
    };
  }

  /**
   * Supabase 메시지 데이터를 GraphQL 형식으로 변환
   */
  private transformMessagesToGraphQL(messages: any[]): Message[] {
    return messages.map((message) => this.transformMessageToGraphQL(message));
  }

  /**
   * Supabase 메시지 데이터를 GraphQL 형식으로 변환 (단일)
   */
  private transformMessageToGraphQL(message: any): Message {
    // 디버깅을 위한 로깅
    if (!message.users) {
      console.warn("메시지에 사용자 정보가 없습니다:", {
        messageId: message.id,
        userId: message.user_id,
        hasUsers: !!message.users,
        messageKeys: Object.keys(message),
      });
    }

    return {
      id: message.id,
      content: message.content,
      created_at: message.created_at,
      user_id: message.user_id,
      user: {
        id: message.users?.id || message.user_id,
        nickname: message.users?.nickname || "알 수 없는 사용자",
        profileImageUrl: message.users?.profile_image_url || null,
      },
      replyTo: message.reply_to
        ? {
            id: message.reply_to.id,
            content: message.reply_to.content,
            user: {
              nickname: message.reply_to.users?.nickname || "알 수 없는 사용자",
            },
          }
        : undefined,
      isSystem: message.is_system || false,
    };
  }

  /**
   * 연결 상태 확인
   * @returns 연결 여부
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }
}

// 싱글톤 인스턴스 생성
export const supabaseChatService = new SupabaseChatService();
export default supabaseChatService;
