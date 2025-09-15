import {
  supabaseChatService,
  ChannelInfo,
  SendMessageInput,
  CreateChannelInput,
} from "../supabase/chatService";
import { Message } from "../../components/chat/ChatList";
import { User } from "../auth";

/**
 * 환경별 채팅 데이터 소스 관리 클래스
 *
 * 개발 환경에서는 임시 데이터를 사용하고,
 * 프로덕션 환경에서는 Supabase를 사용합니다.
 */
export class ChatDataSource {
  private useSupabase: boolean;
  private mockMessages: Message[] = [];
  private mockChannels: ChannelInfo[] = [];

  constructor() {
    // Supabase를 기본값으로 설정 (개발용)
    this.useSupabase = true;
    //console.log(
    //   `채팅 데이터 소스: ${this.useSupabase ? "Supabase" : "Mock Data"}`,
    // );

    if (!this.useSupabase) {
      this.initializeMockData();
    }
  }

  /**
   * 임시 데이터 초기화
   */
  private initializeMockData(): void {
    // 임시 채팅방 데이터
    this.mockChannels = [
      {
        id: "channel-1",
        name: "전체 채팅",
        description: "모든 사용자가 참여할 수 있는 공개 채팅방입니다.",
        isPrivate: false,
        type: "GENERAL",
        isRoomActive: true,
        maxParticipants: 100,
        currentParticipants: 15,
        lastMessage: "오늘 경기 어떻게 보셨나요?",
        lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
        members: [],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "channel-2",
        name: "축구 토론방",
        description: "축구에 대한 모든 이야기를 나누는 공간입니다.",
        isPrivate: false,
        type: "SPORTS",
        isRoomActive: true,
        maxParticipants: 50,
        currentParticipants: 8,
        lastMessage: "💌 다음 경기는 언제인가요?",
        lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
        members: [],
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ];

    // 임시 메시지 데이터
    this.mockMessages = [
      {
        id: "1",
        content: "안녕하세요! 이 채팅방에 오신 것을 환영합니다.",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user_id: "system",
        user: {
          id: "system",
          nickname: "시스템",
          profileImageUrl: undefined,
        },
        isSystem: true,
      },
      {
        id: "2",
        content: "오늘 경기 어떻게 보셨나요?",
        created_at: new Date(Date.now() - 1800000).toISOString(),
        user_id: "user1",
        user: {
          id: "user1",
          nickname: "축구팬123",
          profileImageUrl: undefined,
        },
      },
      {
        id: "3",
        content: "💌 우리 팀이 우승할 것 같아요! 정말 기대됩니다!",
        created_at: new Date(Date.now() - 1500000).toISOString(),
        user_id: "user4",
        user: {
          id: "user4",
          nickname: "열정팬",
          profileImageUrl: undefined,
        },
      },
      {
        id: "4",
        content: "정말 흥미진진한 경기였어요! 특히 후반전이 대박이었죠.",
        created_at: new Date(Date.now() - 1200000).toISOString(),
        user_id: "user2",
        user: {
          id: "user2",
          nickname: "스포츠매니아",
          profileImageUrl: undefined,
        },
      },
      {
        id: "5",
        content: "💌 이번 시즌 최고의 경기였습니다! 감동적이었어요 🏆",
        created_at: new Date(Date.now() - 900000).toISOString(),
        user_id: "user5",
        user: {
          id: "user5",
          nickname: "챔피언",
          profileImageUrl: undefined,
        },
      },
      {
        id: "6",
        content: "맞아요! 마지막 골이 정말 환상적이었습니다 ⚽",
        created_at: new Date(Date.now() - 600000).toISOString(),
        user_id: "user3",
        user: {
          id: "user3",
          nickname: "골키퍼",
          profileImageUrl: undefined,
        },
      },
    ];
  }

  /**
   * 사용자 채팅방 목록 조회
   */
  async getUserChatRooms(): Promise<ChannelInfo[]> {
    if (this.useSupabase) {
      return await supabaseChatService.getUserChatRooms();
    } else {
      // 임시 데이터 반환 (1초 지연으로 실제 API 호출 시뮬레이션)
      await this.simulateDelay(1000);
      return [...this.mockChannels];
    }
  }

  /**
   * 공개 채팅방 목록 조회
   */
  async getPublicChatRooms(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    chatRooms: ChannelInfo[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (this.useSupabase) {
      return await supabaseChatService.getPublicChatRooms(page, limit);
    } else {
      await this.simulateDelay(800);
      return {
        chatRooms: [...this.mockChannels],
        total: this.mockChannels.length,
        page,
        limit,
        totalPages: Math.ceil(this.mockChannels.length / limit),
      };
    }
  }

  /**
   * 채팅방 메시지 조회
   */
  async getChatMessages(
    channelId: string,
    limit: number = 50,
    before?: string,
  ): Promise<Message[]> {
    if (this.useSupabase) {
      return await supabaseChatService.getChatMessages(
        channelId,
        limit,
        before,
      );
    } else {
      await this.simulateDelay(500);
      // 채널별로 필터링하지 않고 모든 메시지 반환 (임시)
      return [...this.mockMessages];
    }
  }

  /**
   * 메시지 전송
   */
  async sendMessage(
    input: SendMessageInput,
    currentUser: User,
  ): Promise<Message | null> {
    if (this.useSupabase) {
      return await supabaseChatService.sendMessage(input);
    } else {
      await this.simulateDelay(1000);

      // 새 메시지 생성
      const newMessage: Message = {
        id: Date.now().toString(),
        content: input.content,
        created_at: new Date().toISOString(),
        user_id: currentUser.id,
        user: {
          id: currentUser.id,
          nickname: currentUser.nickname,
          profileImageUrl: currentUser.profileImageUrl,
        },
        replyTo: input.replyToId
          ? this.mockMessages.find((m) => m.id === input.replyToId)
          : undefined,
        isSystem: false,
      };

      // 임시 데이터에 추가
      this.mockMessages.push(newMessage);

      return newMessage;
    }
  }

  /**
   * 채팅방 생성
   */
  async createChatChannel(
    input: CreateChannelInput,
  ): Promise<ChannelInfo | null> {
    if (this.useSupabase) {
      return await supabaseChatService.createChatChannel(input);
    } else {
      await this.simulateDelay(1500);

      // 새 채팅방 생성
      const newChannel: ChannelInfo = {
        id: `channel-${Date.now()}`,
        name: input.name,
        description: input.description,
        isPrivate: input.isPrivate || false,
        type: input.type || "GENERAL",
        isRoomActive: true,
        maxParticipants: input.maxParticipants || 100,
        currentParticipants: 1,
        lastMessage: undefined,
        lastMessageAt: undefined,
        members: [],
        createdAt: new Date().toISOString(),
      };

      // 임시 데이터에 추가
      this.mockChannels.push(newChannel);

      return newChannel;
    }
  }

  /**
   * 채팅방 참여
   */
  async joinChatChannel(channelId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await supabaseChatService.joinChatChannel(channelId);
    } else {
      await this.simulateDelay(500);

      // 임시로 항상 성공 반환
      const channel = this.mockChannels.find((c) => c.id === channelId);
      if (channel) {
        channel.currentParticipants += 1;
        return true;
      }
      return false;
    }
  }

  /**
   * 채팅방 나가기
   */
  async leaveChatChannel(channelId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await supabaseChatService.leaveChatChannel(channelId);
    } else {
      await this.simulateDelay(500);

      // 임시로 항상 성공 반환
      const channel = this.mockChannels.find((c) => c.id === channelId);
      if (channel && channel.currentParticipants > 0) {
        channel.currentParticipants -= 1;
        return true;
      }
      return false;
    }
  }

  /**
   * 채팅방 읽음 처리
   */
  async markChannelAsRead(channelId: string): Promise<boolean> {
    if (this.useSupabase) {
      return await supabaseChatService.markChannelAsRead(channelId);
    } else {
      await this.simulateDelay(200);
      // 임시로 항상 성공 반환
      return true;
    }
  }

  /**
   * 실시간 메시지 구독
   */
  subscribeToMessages(
    channelId: string,
    onMessage: (message: Message) => void,
  ): () => void {
    if (this.useSupabase) {
      return supabaseChatService.subscribeToMessages(channelId, onMessage);
    } else {
      // 임시 데이터에서는 실시간 구독 시뮬레이션
      //console.log(`Mock: 채널 ${channelId}에 대한 실시간 구독 시작`);

      // 임시로 빈 구독 해제 함수 반환
      return () => {
        //console.log(`Mock: 채널 ${channelId}에 대한 실시간 구독 해제`);
      };
    }
  }

  /**
   * 새로고침 (데이터 다시 로드)
   */
  async refresh(): Promise<void> {
    if (!this.useSupabase) {
      // 임시 데이터 재초기화
      this.initializeMockData();
    }
    await this.simulateDelay(1000);
  }

  /**
   * 데이터 소스 정리
   */
  cleanup(): void {
    if (this.useSupabase) {
      supabaseChatService.cleanup();
    }
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    if (this.useSupabase) {
      return supabaseChatService.isServiceConnected();
    } else {
      // 임시 데이터는 항상 연결된 상태로 간주
      return true;
    }
  }

  /**
   * 현재 사용 중인 데이터 소스 반환
   */
  getDataSourceType(): "supabase" | "mock" {
    return this.useSupabase ? "supabase" : "mock";
  }

  /**
   * API 호출 지연 시뮬레이션
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 환경 전환 (개발용)
   */
  switchToSupabase(): void {
    this.useSupabase = true;
    //console.log("데이터 소스를 Supabase로 전환했습니다.");
  }

  /**
   * 환경 전환 (개발용)
   */
  switchToMock(): void {
    this.useSupabase = false;
    this.initializeMockData();
    //console.log("데이터 소스를 Mock Data로 전환했습니다.");
  }
}

// 싱글톤 인스턴스 생성
export const chatDataSource = new ChatDataSource();
export default chatDataSource;
