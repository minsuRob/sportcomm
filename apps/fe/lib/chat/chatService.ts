import { createClient } from "@supabase/supabase-js";
import { Message } from "@/components/chat/ChatMessage";
import { User, getSession } from "../auth";

/**
 * 채팅 채널 타입 정의
 */
export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  is_private: boolean;
}

/**
 * 채팅 서비스 클래스
 * Supabase를 사용한 채팅 기능을 제공합니다.
 */
export class ChatService {
  private supabase: any; // Supabase 클라이언트
  private realtimeSubscription: any = null; // 실시간 구독 객체
  private currentUser: User | null = null;
  private channelId: string | null = null;

  /**
   * 채팅 서비스 초기화
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API Key
   */
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // 환경 변수 또는 전달된 인자에서 설정 가져오기
    const url = supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error("Supabase URL and key must be provided");
    }

    this.supabase = createClient(url, key);
    this.initUser();
  }

  /**
   * 현재 사용자 정보 초기화
   */
  private async initUser() {
    const { user } = await getSession();
    this.currentUser = user;
  }

  /**
   * 채팅방 목록 가져오기
   */
  async getChannels(): Promise<ChatChannel[]> {
    if (!this.currentUser) await this.initUser();

    const { data, error } = await this.supabase
      .from("chat_channels")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("채팅방 목록 조회 오류:", error);
      throw error;
    }

    return data || [];
  }

  /**
   * 채팅방 생성하기
   */
  async createChannel(
    name: string,
    description?: string,
    isPrivate: boolean = false
  ): Promise<ChatChannel> {
    if (!this.currentUser) await this.initUser();

    const { data, error } = await this.supabase
      .from("chat_channels")
      .insert({
        name,
        description,
        is_private: isPrivate,
        created_by: this.currentUser?.id,
      })
      .select()
      .single();

    if (error) {
      console.error("채팅방 생성 오류:", error);
      throw error;
    }

    return data;
  }

  /**
   * 채팅방 메시지 가져오기
   * @param channelId 채팅방 ID
   * @param limit 가져올 메시지 수 (기본값 50)
   * @param before 특정 날짜 이전 메시지 (페이지네이션)
   */
  async getMessages(
    channelId: string,
    limit: number = 50,
    before?: string
  ): Promise<Message[]> {
    this.channelId = channelId;

    let query = this.supabase
      .from("chat_messages")
      .select(
        `
        *,
        user:user_id (
          id,
          nickname,
          avatar_url
        )
      `
      )
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // 페이지네이션을 위한 조건
    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      console.error("메시지 조회 오류:", error);
      throw error;
    }

    // 시간순 정렬 (오래된 순)
    return (data || []).reverse();
  }

  /**
   * 메시지 전송
   * @param channelId 채팅방 ID
   * @param content 메시지 내용
   * @param replyToId 답장 대상 메시지 ID (선택적)
   */
  async sendMessage(
    channelId: string,
    content: string,
    replyToId?: string
  ): Promise<Message | null> {
    if (!this.currentUser) await this.initUser();
    if (!this.currentUser) {
      throw new Error("로그인이 필요합니다");
    }

    const { data, error } = await this.supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        user_id: this.currentUser.id,
        content,
        reply_to: replyToId,
      })
      .select(
        `
        *,
        user:user_id (
          id,
          nickname,
          avatar_url
        )
      `
      )
      .single();

    if (error) {
      console.error("메시지 전송 오류:", error);
      throw error;
    }

    // 채팅방 최신 메시지 업데이트
    await this.updateChannelLastMessage(channelId, content);

    return data;
  }

  /**
   * 채팅방 최근 메시지 업데이트
   */
  private async updateChannelLastMessage(
    channelId: string,
    lastMessage: string
  ) {
    const { error } = await this.supabase
      .from("chat_channels")
      .update({
        last_message: lastMessage,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", channelId);

    if (error) {
      console.error("채팅방 업데이트 오류:", error);
    }
  }

  /**
   * 실시간 채팅 구독 시작
   * @param channelId 채팅방 ID
   * @param onNewMessage 새 메시지 이벤트 핸들러
   */
  subscribeToMessages(
    channelId: string,
    onNewMessage: (message: Message) => void
  ): void {
    // 이미 구독 중이라면 이전 구독 해제
    this.unsubscribeFromMessages();

    this.channelId = channelId;

    // Supabase Realtime 구독 설정
    this.realtimeSubscription = this.supabase
      .channel(`chat:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: { new: any }) => {
          try {
            // 새 메시지가 도착했을 때 사용자 정보 포함하여 처리
            const message = payload.new;

            // 사용자 정보 조회
            const { data: userData, error: userError } = await this.supabase
              .from("users")
              .select("id, nickname, avatar_url")
              .eq("id", message.user_id)
              .single();

            if (userError) {
              console.error("사용자 정보 조회 오류:", userError);
              return;
            }

            // 콜백 호출
            onNewMessage({
              ...message,
              user: userData,
            });
          } catch (error) {
            console.error("메시지 처리 오류:", error);
          }
        }
      )
      .subscribe();
  }

  /**
   * 실시간 구독 해제
   */
  unsubscribeFromMessages(): void {
    if (this.realtimeSubscription && this.channelId) {
      this.supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
  }

  /**
   * 로컬 테스트용 Mock 서비스
   * 실제 Supabase 없이 로컬에서 테스트하기 위한 메서드
   */
  getMockMessages(count: number = 10): Message[] {
    const mockUsers = [
      { id: '1', nickname: '김스포츠', avatar_url: null },
      { id: '2', nickname: '이축구', avatar_url: null },
      { id: '3', nickname: '박농구', avatar_url: null },
      { id: '4', nickname: '최야구', avatar_url: null },
    ];

    const messages: Message[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const isSystem = Math.random() > 0.9; // 10%는 시스템 메시지

      const message: Message = {
        id: `mock-${i}`,
        content: isSystem
          ? '새로운 사용자가 입장했습니다.'
          : `테스트 메시지 ${i + 1}입니다. 안녕하세요!`,
        created_at: new Date(now.getTime() - (count - i) * 60000).toISOString(),
        user_id: user.id,
        user: user,
        is_system: isSystem
      };

      messages.push(message);
    }

    return messages;
  }

  /**
   * 로컬 테스트용 Mock 메시지 전송
   */
  async sendMockMessage(content: string): Promise<Message> {
    if (!this.currentUser) {
      // 테스트용 사용자 설정
      this.currentUser = {
        id: '1',
        nickname: '김스포츠',
        email: 'test@example.com'
      };
    }

    const mockMessage: Message = {
      id: `mock-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      user_id: this.currentUser.id,
      user: {
        id: this.currentUser.id,
        nickname: this.currentUser.nickname,
        avatar_url: null
      }
    };

    return mockMessage;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const chatService = new ChatService();
