import { createClient } from "@supabase/supabase-js";
import { Message } from "@/components/chat/ChatMessage";
import { User, getSession } from "../auth";

/**
 * 로컬 모드 사용 여부 설정
 * - true: Supabase 연결 없이 로컬 메모리에서 테스트 데이터 사용
 * - false: 실제 Supabase 서버에 연결하여 데이터 처리
 */
const USE_LOCAL_MODE = true;

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
 * 로컬 모드에서는 실제 서버 연결 없이 로컬 테스트 가능
 */
export class ChatService {
  private supabase: any; // Supabase 클라이언트
  private realtimeSubscription: any = null; // 실시간 구독 객체
  private currentUser: User | null = null;
  private channelId: string | null = null;

  // 로컬 모드 관련 변수
  private isLocalMode: boolean = USE_LOCAL_MODE;
  private mockChannels: ChatChannel[] = []; // 로컬 테스트용 채널 목록
  private mockMessages: Record<string, Message[]> = {}; // 채널별 메시지 목록

  /**
   * 채팅 서비스 초기화
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API Key
   * @param forceLocalMode 강제로 로컬 모드 설정 (선택적)
   */
  constructor(
    supabaseUrl?: string,
    supabaseKey?: string,
    forceLocalMode?: boolean,
  ) {
    // 로컬 모드 설정 (명시적으로 전달된 경우 우선 적용)
    if (forceLocalMode !== undefined) {
      this.isLocalMode = forceLocalMode;
    }

    if (this.isLocalMode) {
      console.log("ChatService 초기화 - 로컬 모드로 실행 중");
      // 테스트용 채널 생성
      this.initMockChannels();
    } else {
      // Supabase 클라이언트 초기화
      const url = supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = supabaseKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        console.warn(
          "Supabase URL 또는 Key가 제공되지 않아 로컬 모드로 전환합니다",
        );
        this.isLocalMode = true;
        this.initMockChannels();
      } else {
        try {
          this.supabase = createClient(url, key);
          console.log("Supabase 클라이언트 초기화 완료");
        } catch (error) {
          console.error("Supabase 클라이언트 초기화 오류:", error);
          console.log("로컬 모드로 대체합니다");
          this.isLocalMode = true;
          this.initMockChannels();
        }
      }
    }

    this.initUser();
  }

  /**
   * 현재 사용자 정보 초기화
   */
  private async initUser() {
    const { user } = await getSession();

    if (user) {
      this.currentUser = user;
    } else if (this.isLocalMode) {
      // 로컬 모드에서만 테스트용 사용자 생성
      this.currentUser = {
        id: "1",
        nickname: "김스포츠",
        email: "test@example.com",
      };
      console.log("테스트용 사용자로 초기화되었습니다");
    } else {
      console.warn("사용자 인증이 필요합니다");
      this.currentUser = null;
    }
  }

  /**
   * 테스트용 채널 초기화
   */
  private initMockChannels() {
    this.mockChannels = [
      {
        id: "channel-1",
        name: "일반 채팅",
        description: "모두를 위한 오픈 채팅방입니다",
        created_at: new Date().toISOString(),
        last_message: "안녕하세요, 반갑습니다!",
        last_message_at: new Date().toISOString(),
        is_private: false,
      },
      {
        id: "channel-2",
        name: "스포츠 커뮤니티",
        description: "스포츠 소식 및 정보 공유",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        last_message: "오늘 경기 결과 어땠나요?",
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        is_private: false,
      },
      {
        id: "channel-3",
        name: "공지사항",
        description: "중요 공지사항",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        last_message: "새로운 기능이 추가되었습니다.",
        last_message_at: new Date(Date.now() - 7200000).toISOString(),
        is_private: false,
      },
    ];

    // 각 채널에 테스트 메시지 추가
    this.mockChannels.forEach((channel) => {
      this.mockMessages[channel.id] = this.getMockMessages(20);
    });
  }

  /**
   * 채팅방 목록 가져오기
   */
  async getChannels(): Promise<ChatChannel[]> {
    if (!this.currentUser) await this.initUser();

    // 로컬 모드인 경우 테스트 데이터 반환
    if (this.isLocalMode) {
      return [...this.mockChannels];
    }

    // Supabase에서 채널 목록 조회
    try {
      const { data, error } = await this.supabase
        .from("chat_channels")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) {
        console.error("채팅방 목록 조회 오류:", error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error("채팅방 목록 조회 중 오류 발생:", error);
      // 오류 발생 시 빈 배열 반환
      return [];
    }
  }

  /**
   * 채팅방 생성하기
   */
  async createChannel(
    name: string,
    description?: string,
    isPrivate: boolean = false,
  ): Promise<ChatChannel> {
    if (!this.currentUser) await this.initUser();
    if (!this.currentUser) {
      throw new Error("로그인이 필요합니다");
    }

    // 로컬 모드인 경우 로컬에서 처리
    if (this.isLocalMode) {
      const newChannel: ChatChannel = {
        id: `channel-${Date.now()}`,
        name,
        description,
        is_private: isPrivate,
        created_at: new Date().toISOString(),
        last_message: "채팅방이 생성되었습니다.",
        last_message_at: new Date().toISOString(),
      };

      this.mockChannels.push(newChannel);
      this.mockMessages[newChannel.id] = this.getMockMessages(5);

      return newChannel;
    }

    // Supabase를 통한 채널 생성
    try {
      const { data, error } = await this.supabase
        .from("chat_channels")
        .insert({
          name,
          description,
          is_private: isPrivate,
          created_by: this.currentUser.id,
        })
        .select()
        .single();

      if (error) {
        console.error("채팅방 생성 오류:", error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("채팅방 생성 중 오류 발생:", error);
      throw error;
    }
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
    before?: string,
  ): Promise<Message[]> {
    this.channelId = channelId;

    // 로컬 모드인 경우 테스트 데이터 반환
    if (this.isLocalMode) {
      let messages = this.mockMessages[channelId] || [];

      // 페이지네이션 구현
      if (before) {
        const beforeDate = new Date(before).getTime();
        messages = messages.filter(
          (msg) => new Date(msg.created_at).getTime() < beforeDate,
        );
      }

      // 시간순으로 정렬하고 limit 적용
      messages = messages
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .slice(-limit);

      return messages;
    }

    // Supabase에서 메시지 조회
    try {
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
        `,
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
    } catch (error) {
      console.error("메시지 조회 중 오류 발생:", error);
      return [];
    }
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
    replyToId?: string,
  ): Promise<Message | null> {
    if (!this.currentUser) await this.initUser();
    if (!this.currentUser) {
      throw new Error("로그인이 필요합니다");
    }

    // 로컬 모드인 경우 로컬에서 처리
    if (this.isLocalMode) {
      // 새 메시지 생성
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        channel_id: channelId,
        user_id: this.currentUser.id,
        content,
        reply_to: replyToId,
        created_at: new Date().toISOString(),
        user: {
          id: this.currentUser.id,
          nickname: this.currentUser.nickname,
          avatar_url: null,
        },
      };

      // 채널에 메시지 추가
      if (!this.mockMessages[channelId]) {
        this.mockMessages[channelId] = [];
      }
      this.mockMessages[channelId].push(newMessage);

      // 채팅방 최신 메시지 업데이트
      await this.updateChannelLastMessage(channelId, content);

      return newMessage;
    }

    // Supabase를 통한 메시지 전송
    try {
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
        `,
        )
        .single();

      if (error) {
        console.error("메시지 전송 오류:", error);
        throw error;
      }

      // 채팅방 최신 메시지 업데이트
      await this.updateChannelLastMessage(channelId, content);

      return data;
    } catch (error) {
      console.error("메시지 전송 중 오류 발생:", error);
      throw error;
    }
  }

  /**
   * 채팅방 최근 메시지 업데이트
   */
  private async updateChannelLastMessage(
    channelId: string,
    lastMessage: string,
  ) {
    // 로컬 모드인 경우 로컬에서 처리
    if (this.isLocalMode) {
      const channelIndex = this.mockChannels.findIndex(
        (ch) => ch.id === channelId,
      );
      if (channelIndex >= 0) {
        this.mockChannels[channelIndex].last_message = lastMessage;
        this.mockChannels[channelIndex].last_message_at =
          new Date().toISOString();
      }
      return;
    }

    // Supabase를 통한 채널 업데이트
    try {
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
    } catch (error) {
      console.error("채팅방 업데이트 중 오류 발생:", error);
    }
  }

  /**
   * 실시간 채팅 구독 시작
   * @param channelId 채팅방 ID
   * @param onNewMessage 새 메시지 이벤트 핸들러
   */
  subscribeToMessages(
    channelId: string,
    onNewMessage: (message: Message) => void,
  ): void {
    // 이미 구독 중이라면 이전 구독 해제
    this.unsubscribeFromMessages();

    this.channelId = channelId;

    // 로컬 모드인 경우 시뮬레이션 구현
    if (this.isLocalMode) {
      console.log(`채팅 구독 시작 (로컬 모드): ${channelId}`);

      // 테스트용 주기적 메시지 생성
      this.realtimeSubscription = setInterval(() => {
        // 20% 확률로 새 메시지 발생
        if (Math.random() > 0.8) {
          const mockUsers = [
            { id: "2", nickname: "이축구", avatar_url: null },
            { id: "3", nickname: "박농구", avatar_url: null },
            { id: "4", nickname: "최야구", avatar_url: null },
          ];

          // 랜덤 사용자 선택 (내가 아닌 다른 사용자)
          const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];

          const newMessage: Message = {
            id: `msg-${Date.now()}`,
            channel_id: channelId,
            content: `자동 생성된 메시지 ${new Date().toLocaleTimeString()}`,
            created_at: new Date().toISOString(),
            user_id: user.id,
            user: user,
          };

          // 메시지 저장 및 콜백 실행
          if (!this.mockMessages[channelId]) {
            this.mockMessages[channelId] = [];
          }
          this.mockMessages[channelId].push(newMessage);

          onNewMessage(newMessage);

          // 채널 정보도 업데이트
          this.updateChannelLastMessage(channelId, newMessage.content);
        }
      }, 5000); // 5초마다 확인
      return;
    }

    // Supabase Realtime 구독 설정
    try {
      console.log(`채팅 구독 시작 (Supabase): ${channelId}`);

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
          },
        )
        .subscribe();
    } catch (error) {
      console.error("Supabase 실시간 구독 오류:", error);
      // 오류 발생 시 로컬 모드로 대체
      this.isLocalMode = true;
      this.subscribeToMessages(channelId, onNewMessage);
    }
  }

  /**
   * 실시간 구독 해제
   */
  unsubscribeFromMessages(): void {
    if (!this.realtimeSubscription) return;

    if (this.isLocalMode) {
      // 로컬 테스트용 구독 해제
      clearInterval(this.realtimeSubscription);
      this.realtimeSubscription = null;
      console.log("채팅 구독 해제 (로컬 모드)");
    } else {
      // Supabase 구독 해제
      try {
        this.supabase.removeChannel(this.realtimeSubscription);
        this.realtimeSubscription = null;
        console.log("채팅 구독 해제 (Supabase)");
      } catch (error) {
        console.error("Supabase 채널 해제 오류:", error);
      }
    }
  }

  /**
   * 로컬 테스트용 Mock 서비스
   * 실제 Supabase 없이 로컬에서 테스트하기 위한 메서드
   */
  getMockMessages(count: number = 10): Message[] {
    const mockUsers = [
      { id: "1", nickname: "김스포츠", avatar_url: null },
      { id: "2", nickname: "이축구", avatar_url: null },
      { id: "3", nickname: "박농구", avatar_url: null },
      { id: "4", nickname: "최야구", avatar_url: null },
    ];

    const messages: Message[] = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const user = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const isSystem = Math.random() > 0.9; // 10%는 시스템 메시지

      const message: Message = {
        id: `mock-${i}`,
        content: isSystem
          ? "새로운 사용자가 입장했습니다."
          : `테스트 메시지 ${i + 1}입니다. 안녕하세요!`,
        created_at: new Date(now.getTime() - (count - i) * 60000).toISOString(),
        user_id: user.id,
        user: user,
        is_system: isSystem,
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
        id: "1",
        nickname: "김스포츠",
        email: "test@example.com",
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
        avatar_url: null,
      },
    };

    return mockMessage;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const chatService = new ChatService();

// 상태 정보 출력
console.log(
  `ChatService가 ${USE_LOCAL_MODE ? "로컬 테스트" : "Supabase"} 모드로 초기화되었습니다.`,
);
