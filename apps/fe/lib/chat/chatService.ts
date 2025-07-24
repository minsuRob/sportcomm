// import { createClient } from "@supabase/supabase-js";
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
  // private supabase: any; // Supabase 클라이언트
  private realtimeSubscription: any = null; // 실시간 구독 객체
  private currentUser: User | null = null;
  private channelId: string | null = null;
  private mockChannels: ChatChannel[] = []; // 로컬 테스트용 채널 목록
  private mockMessages: Record<string, Message[]> = {}; // 채널별 메시지 목록

  /**
   * 채팅 서비스 초기화
   * @param supabaseUrl Supabase URL
   * @param supabaseKey Supabase API Key
   */
  constructor(supabaseUrl?: string, supabaseKey?: string) {
    // 로컬 테스트용 초기화
    console.log("ChatService 초기화 - 로컬 모드로 실행 중");

    // 테스트용 채널 생성
    this.initMockChannels();
    this.initUser();
  }

  /**
   * 현재 사용자 정보 초기화
   */
  private async initUser() {
    const { user } = await getSession();
    // 세션이 없을 경우 테스트용 사용자 생성
    this.currentUser = user || {
      id: "1",
      nickname: "김스포츠",
      email: "test@example.com",
    };
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

    // 로컬 테스트용 채널 목록 반환
    return [...this.mockChannels];
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

    // 로컬 테스트용 채널 생성
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

    // 로컬 테스트용 메시지 반환
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

  /**
   * 채팅방 최근 메시지 업데이트
   */
  private async updateChannelLastMessage(
    channelId: string,
    lastMessage: string,
  ) {
    // 로컬 테스트용 채널 업데이트
    const channelIndex = this.mockChannels.findIndex(
      (ch) => ch.id === channelId,
    );
    if (channelIndex >= 0) {
      this.mockChannels[channelIndex].last_message = lastMessage;
      this.mockChannels[channelIndex].last_message_at =
        new Date().toISOString();
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

    // 로컬 테스트용 메시지 구독 시뮬레이션
    console.log(`채팅 구독 시작: ${channelId}`);

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
  }

  /**
   * 실시간 구독 해제
   */
  unsubscribeFromMessages(): void {
    // 로컬 테스트용 구독 해제
    if (this.realtimeSubscription) {
      clearInterval(this.realtimeSubscription);
      this.realtimeSubscription = null;
      console.log("채팅 구독 해제");
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

// 콘솔에 테스트 메시지 출력
console.log("ChatService가 로컬 테스트 모드로 초기화되었습니다.");
