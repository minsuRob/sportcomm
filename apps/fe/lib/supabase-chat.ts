import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 채팅 메시지 인터페이스
 */
export interface ChatMessage {
  id: string;
  room_id: string;
  author_id: string;
  content: string;
  message_type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  reply_to_message_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  author?: {
    id: string;
    nickname: string;
    profile_image_url?: string;
    role: string;
  };
}

/**
 * 채팅방 인터페이스
 */
export interface ChatRoom {
  id: string;
  name?: string;
  type: "DIRECT" | "GROUP" | "CHANNEL";
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // 조인된 데이터
  members?: ChatRoomMember[];
  last_message?: ChatMessage;
}

/**
 * 채팅방 멤버 인터페이스
 */
export interface ChatRoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_active: boolean;
  // 조인된 데이터
  user?: {
    id: string;
    nickname: string;
    profile_image_url?: string;
    role: string;
  };
}

/**
 * Supabase 채팅 클라이언트
 *
 * 채팅 및 실시간 기능을 위한 Supabase 클라이언트입니다.
 * React Native 환경에서 AsyncStorage를 사용하여 세션을 관리합니다.
 */
class SupabaseChatClient {
  private client: SupabaseClient | null = null;
  private isInitialized = false;

  /**
   * Supabase 클라이언트 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn(
        "Supabase 환경 변수가 설정되지 않았습니다. 채팅 기능이 비활성화됩니다."
      );
      return;
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    this.isInitialized = true;
    console.log("✅ Supabase 채팅 클라이언트가 초기화되었습니다.");
  }

  /**
   * 클라이언트 인스턴스 반환
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * 저장된 Supabase 세션으로 인증 설정
   *
   * @param session - 백엔드에서 받은 Supabase 세션 정보
   */
  async setSession(session: {
    access_token: string;
    refresh_token: string;
    user_id: string;
    user_email: string;
  }) {
    if (!this.client) {
      throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
    }

    const { error } = await this.client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error("Supabase 세션 설정 실패:", error);
      throw error;
    }

    console.log("✅ Supabase 세션이 설정되었습니다.");
  }

  /**
   * 사용자 로그아웃
   */
  async signOut() {
    if (!this.client) return;

    const { error } = await this.client.auth.signOut();
    if (error) {
      console.error("Supabase 로그아웃 실패:", error);
      throw error;
    }
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser() {
    if (!this.client) return null;

    const {
      data: { user },
    } = await this.client.auth.getUser();
    return user;
  }

  /**
   * 채팅방 목록 조회
   *
   * @param userId - 사용자 ID
   * @returns 채팅방 목록
   */
  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from("chat_rooms")
      .select(
        `
        *,
        chat_room_members!inner(
          *,
          profiles:user_id(id, nickname, profile_image_url, role)
        )
      `
      )
      .eq("chat_room_members.user_id", userId)
      .eq("chat_room_members.is_active", true)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("채팅방 목록 조회 실패:", error);
      return [];
    }

    return data || [];
  }

  /**
   * 채팅 메시지 조회
   *
   * @param roomId - 채팅방 ID
   * @param limit - 조회할 메시지 수
   * @param before - 이전 메시지 기준점
   * @returns 채팅 메시지 목록
   */
  async getChatMessages(
    roomId: string,
    limit: number = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    if (!this.client) return [];

    let query = this.client
      .from("chat_messages")
      .select(
        `
        *,
        profiles:author_id(id, nickname, profile_image_url, role)
      `
      )
      .eq("room_id", roomId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      console.error("채팅 메시지 조회 실패:", error);
      return [];
    }

    return (data || []).reverse(); // 시간순으로 정렬
  }

  /**
   * 채팅 메시지 전송
   *
   * @param roomId - 채팅방 ID
   * @param content - 메시지 내용
   * @param messageType - 메시지 타입
   * @param replyToMessageId - 답글 대상 메시지 ID
   * @returns 전송된 메시지
   */
  async sendMessage(
    roomId: string,
    content: string,
    messageType: "TEXT" | "IMAGE" | "FILE" = "TEXT",
    replyToMessageId?: string
  ): Promise<ChatMessage | null> {
    if (!this.client) return null;

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    const messageData = {
      room_id: roomId,
      author_id: user.id,
      content,
      message_type: messageType,
      reply_to_message_id: replyToMessageId,
    };

    const { data, error } = await this.client
      .from("chat_messages")
      .insert(messageData)
      .select(
        `
        *,
        profiles:author_id(id, nickname, profile_image_url, role)
      `
      )
      .single();

    if (error) {
      console.error("메시지 전송 실패:", error);
      throw error;
    }

    return data;
  }

  /**
   * 채팅 메시지 실시간 구독
   *
   * @param roomId - 채팅방 ID
   * @param onMessage - 새 메시지 콜백
   * @returns 구독 해제 함수
   */
  subscribeToMessages(
    roomId: string,
    onMessage: (message: ChatMessage) => void
  ): (() => void) | null {
    if (!this.client) return null;

    const subscription = this.client
      .channel(`chat-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // 새 메시지에 대한 추가 정보 조회
          const { data } = await this.client!.from("chat_messages")
            .select(
              `
              *,
              profiles:author_id(id, nickname, profile_image_url, role)
            `
            )
            .eq("id", payload.new.id)
            .single();

          if (data) {
            onMessage(data as ChatMessage);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * 채팅방 생성
   *
   * @param name - 채팅방 이름
   * @param type - 채팅방 타입
   * @param memberIds - 참여자 ID 목록
   * @returns 생성된 채팅방
   */
  async createChatRoom(
    name: string,
    type: "DIRECT" | "GROUP" | "CHANNEL" = "GROUP",
    memberIds: string[] = []
  ): Promise<ChatRoom | null> {
    if (!this.client) return null;

    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    // 트랜잭션으로 채팅방과 멤버를 함께 생성
    const { data: room, error: roomError } = await this.client
      .from("chat_rooms")
      .insert({
        name,
        type,
        created_by: user.id,
      })
      .select()
      .single();

    if (roomError) {
      console.error("채팅방 생성 실패:", roomError);
      throw roomError;
    }

    // 생성자와 멤버들을 채팅방에 추가
    const allMemberIds = [user.id, ...memberIds.filter((id) => id !== user.id)];
    const memberData = allMemberIds.map((userId) => ({
      room_id: room.id,
      user_id: userId,
    }));

    const { error: memberError } = await this.client
      .from("chat_room_members")
      .insert(memberData);

    if (memberError) {
      console.error("채팅방 멤버 추가 실패:", memberError);
      // 채팅방 삭제 (롤백)
      await this.client.from("chat_rooms").delete().eq("id", room.id);
      throw memberError;
    }

    return room;
  }

  /**
   * 마지막 읽은 메시지 업데이트
   *
   * @param roomId - 채팅방 ID
   * @param messageId - 마지막 읽은 메시지 ID
   */
  async updateLastRead(roomId: string): Promise<void> {
    if (!this.client) return;

    const user = await this.getCurrentUser();
    if (!user) return;

    const { error } = await this.client
      .from("chat_room_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("room_id", roomId)
      .eq("user_id", user.id);

    if (error) {
      console.error("마지막 읽은 시간 업데이트 실패:", error);
    }
  }

  /**
   * 읽지 않은 메시지 수 조회
   *
   * @param roomId - 채팅방 ID
   * @returns 읽지 않은 메시지 수
   */
  async getUnreadCount(roomId: string): Promise<number> {
    if (!this.client) return 0;

    const user = await this.getCurrentUser();
    if (!user) return 0;

    // 사용자의 마지막 읽은 시간 조회
    const { data: member } = await this.client
      .from("chat_room_members")
      .select("last_read_at")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .single();

    if (!member) return 0;

    // 마지막 읽은 시간 이후의 메시지 수 조회
    const { count } = await this.client
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .gt("created_at", member.last_read_at)
      .neq("author_id", user.id); // 본인 메시지 제외

    return count || 0;
  }
}

// 싱글톤 인스턴스
export const supabaseChatClient = new SupabaseChatClient();

// 초기화 함수 (앱 시작 시 호출)
export const initializeSupabaseChat = async () => {
  await supabaseChatClient.initialize();
};

export default supabaseChatClient;
