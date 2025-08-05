import { chatDataSource, ChatDataSource } from "./dataSource";
import { Message } from "../../components/chat/ChatList";
import { User } from "../auth";
import {
  ChannelInfo,
  SendMessageInput,
  CreateChannelInput,
} from "../supabase/chatService";

/**
 * 통합 채팅 서비스 클래스
 *
 * 이 서비스는 환경에 따라 자동으로 데이터 소스를 선택합니다:
 * - 개발 환경: 임시 데이터 (Mock Data)
 * - 프로덕션 환경: Supabase 백엔드
 */
export class ChatService {
  private dataSource: ChatDataSource;
  private realtimeSubscriptions: Map<string, () => void> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.dataSource = chatDataSource;
    this.initialize();
  }

  /**
   * 서비스 초기화
   */
  private async initialize(): Promise<void> {
    try {
      console.log(
        `채팅 서비스 초기화 중... (${this.dataSource.getDataSourceType()})`,
      );
      this.isInitialized = true;
      console.log("채팅 서비스 초기화 완료");
    } catch (error) {
      console.error("채팅 서비스 초기화 실패:", error);
      this.isInitialized = false;
    }
  }

  /**
   * 사용자 채팅방 목록 조회
   * @returns 사용자가 참여한 채팅방 목록
   */
  async getUserChatRooms(): Promise<ChannelInfo[]> {
    this.ensureInitialized();

    try {
      const channels = await this.dataSource.getUserChatRooms();
      console.log(`사용자 채팅방 ${channels.length}개 조회 완료`);
      return channels;
    } catch (error) {
      console.error("사용자 채팅방 목록 조회 실패:", error);
      return [];
    }
  }

  /**
   * 공개 채팅방 목록 조회
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 20)
   * @returns 공개 채팅방 목록과 페이지네이션 정보
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
    this.ensureInitialized();

    try {
      const result = await this.dataSource.getPublicChatRooms(page, limit);
      console.log(
        `공개 채팅방 ${result.chatRooms.length}개 조회 완료 (${page}/${result.totalPages} 페이지)`,
      );
      return result;
    } catch (error) {
      console.error("공개 채팅방 목록 조회 실패:", error);
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
   * @param limit 메시지 개수 제한 (기본값: 50)
   * @param before 이전 메시지 기준 시간 (페이지네이션용)
   * @returns 메시지 목록
   */
  async getChatMessages(
    channelId: string,
    limit: number = 50,
    before?: string,
  ): Promise<Message[]> {
    this.ensureInitialized();

    try {
      const messages = await this.dataSource.getChatMessages(
        channelId,
        limit,
        before,
      );
      console.log(
        `채팅방 ${channelId}의 메시지 ${messages.length}개 조회 완료`,
      );
      return messages;
    } catch (error) {
      console.error("채팅 메시지 조회 실패:", error);
      return [];
    }
  }

  /**
   * 메시지 전송
   * @param channelId 채팅방 ID
   * @param content 메시지 내용
   * @param currentUser 현재 사용자 정보
   * @param replyToId 답장할 메시지 ID (선택사항)
   * @returns 전송된 메시지 또는 null
   */
  async sendMessage(
    channelId: string,
    content: string,
    currentUser: User,
    replyToId?: string,
  ): Promise<Message | null> {
    this.ensureInitialized();

    if (!content.trim()) {
      console.warn("빈 메시지는 전송할 수 없습니다.");
      return null;
    }

    try {
      const input: SendMessageInput = {
        channelId,
        content: content.trim(),
        replyToId,
      };

      const message = await this.dataSource.sendMessage(input, currentUser);

      if (message) {
        console.log(`메시지 전송 완료: ${message.id}`);
      } else {
        console.error("메시지 전송 실패: null 반환");
      }

      return message;
    } catch (error) {
      console.error("메시지 전송 실패:", error);
      return null;
    }
  }

  /**
   * 채팅방 생성
   * @param name 채팅방 이름
   * @param description 채팅방 설명 (선택사항)
   * @param isPrivate 비공개 여부 (기본값: false)
   * @param type 채팅방 타입 (기본값: "GENERAL")
   * @param maxParticipants 최대 참여자 수 (기본값: 100)
   * @returns 생성된 채팅방 정보 또는 null
   */
  async createChatChannel(
    name: string,
    description?: string,
    isPrivate: boolean = false,
    type: string = "GENERAL",
    maxParticipants: number = 100,
  ): Promise<ChannelInfo | null> {
    this.ensureInitialized();

    if (!name.trim()) {
      console.warn("채팅방 이름은 필수입니다.");
      return null;
    }

    try {
      const input: CreateChannelInput = {
        name: name.trim(),
        description: description?.trim(),
        isPrivate,
        type,
        maxParticipants,
      };

      const channel = await this.dataSource.createChatChannel(input);

      if (channel) {
        console.log(`채팅방 생성 완료: ${channel.name} (${channel.id})`);
      } else {
        console.error("채팅방 생성 실패: null 반환");
      }

      return channel;
    } catch (error) {
      console.error("채팅방 생성 실패:", error);
      return null;
    }
  }

  /**
   * 채팅방 참여
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async joinChatChannel(channelId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const success = await this.dataSource.joinChatChannel(channelId);

      if (success) {
        console.log(`채팅방 참여 완료: ${channelId}`);
      } else {
        console.error(`채팅방 참여 실패: ${channelId}`);
      }

      return success;
    } catch (error) {
      console.error("채팅방 참여 실패:", error);
      return false;
    }
  }

  /**
   * 채팅방 나가기
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async leaveChatChannel(channelId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const success = await this.dataSource.leaveChatChannel(channelId);

      if (success) {
        console.log(`채팅방 나가기 완료: ${channelId}`);
        // 실시간 구독도 해제
        this.unsubscribeFromMessages(channelId);
      } else {
        console.error(`채팅방 나가기 실패: ${channelId}`);
      }

      return success;
    } catch (error) {
      console.error("채팅방 나가기 실패:", error);
      return false;
    }
  }

  /**
   * 채팅방 읽음 처리
   * @param channelId 채팅방 ID
   * @returns 성공 여부
   */
  async markChannelAsRead(channelId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const success = await this.dataSource.markChannelAsRead(channelId);

      if (success) {
        console.log(`채팅방 읽음 처리 완료: ${channelId}`);
      }

      return success;
    } catch (error) {
      console.error("채팅방 읽음 처리 실패:", error);
      return false;
    }
  }

  /**
   * 실시간 메시지 구독
   * @param channelId 채팅방 ID
   * @param onMessage 새 메시지 수신 콜백 함수
   * @returns 구독 해제 함수
   */
  subscribeToMessages(
    channelId: string,
    onMessage: (message: Message) => void,
  ): () => void {
    this.ensureInitialized();

    // 기존 구독 해제
    this.unsubscribeFromMessages(channelId);

    try {
      const unsubscribe = this.dataSource.subscribeToMessages(
        channelId,
        (message: Message) => {
          console.log(`새 메시지 수신: ${message.id} (채널: ${channelId})`);
          onMessage(message);
        },
      );

      // 구독 해제 함수 저장
      this.realtimeSubscriptions.set(channelId, unsubscribe);

      console.log(`실시간 메시지 구독 시작: ${channelId}`);

      return () => this.unsubscribeFromMessages(channelId);
    } catch (error) {
      console.error("실시간 메시지 구독 실패:", error);
      return () => {};
    }
  }

  /**
   * 실시간 메시지 구독 해제
   * @param channelId 채팅방 ID
   */
  unsubscribeFromMessages(channelId: string): void {
    const unsubscribe = this.realtimeSubscriptions.get(channelId);
    if (unsubscribe) {
      try {
        unsubscribe();
        this.realtimeSubscriptions.delete(channelId);
        console.log(`실시간 메시지 구독 해제: ${channelId}`);
      } catch (error) {
        console.error("실시간 메시지 구독 해제 실패:", error);
      }
    }
  }

  /**
   * 새로고침 (데이터 다시 로드)
   */
  async refresh(): Promise<void> {
    try {
      await this.dataSource.refresh();
      console.log("채팅 데이터 새로고침 완료");
    } catch (error) {
      console.error("채팅 데이터 새로고침 실패:", error);
    }
  }

  /**
   * 서비스 정리 (모든 구독 해제)
   */
  cleanup(): void {
    try {
      // 모든 실시간 구독 해제
      this.realtimeSubscriptions.forEach((unsubscribe, channelId) => {
        unsubscribe();
        console.log(`구독 해제: ${channelId}`);
      });
      this.realtimeSubscriptions.clear();

      // 데이터 소스 정리
      this.dataSource.cleanup();

      console.log("채팅 서비스 정리 완료");
    } catch (error) {
      console.error("채팅 서비스 정리 실패:", error);
    }
  }

  /**
   * 연결 상태 확인
   * @returns 연결 여부
   */
  isConnected(): boolean {
    return this.isInitialized && this.dataSource.isConnected();
  }

  /**
   * 현재 데이터 소스 타입 반환
   * @returns "supabase" | "mock"
   */
  getDataSourceType(): "supabase" | "mock" {
    return this.dataSource.getDataSourceType();
  }

  /**
   * 초기화 상태 확인
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("채팅 서비스가 초기화되지 않았습니다.");
    }
  }

  /**
   * 개발용: Supabase로 전환
   */
  switchToSupabase(): void {
    this.dataSource.switchToSupabase();
    console.log("채팅 서비스를 Supabase로 전환했습니다.");
  }

  /**
   * 개발용: Mock 데이터로 전환
   */
  switchToMock(): void {
    this.dataSource.switchToMock();
    console.log("채팅 서비스를 Mock 데이터로 전환했습니다.");
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
export const chatService = new ChatService();
export default chatService;
