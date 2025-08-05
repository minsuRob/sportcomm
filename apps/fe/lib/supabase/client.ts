import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";

// Supabase 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      chat_channels: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_private: boolean;
          type: string;
          is_room_active: boolean;
          max_participants: number | null;
          current_participants: number;
          last_message: string | null;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_private?: boolean;
          type?: string;
          is_room_active?: boolean;
          max_participants?: number | null;
          current_participants?: number;
          last_message?: string | null;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_private?: boolean;
          type?: string;
          is_room_active?: boolean;
          max_participants?: number | null;
          current_participants?: number;
          last_message?: string | null;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
          reply_to_id: string | null;
          is_system: boolean;
          is_deleted: boolean;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          reply_to_id?: string | null;
          is_system?: boolean;
          is_deleted?: boolean;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          reply_to_id?: string | null;
          is_system?: boolean;
          is_deleted?: boolean;
        };
      };
      chat_channel_members: {
        Row: {
          id: string;
          channel_id: string;
          user_id: string;
          is_admin: boolean;
          joined_at: string;
          last_read_at: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          channel_id: string;
          user_id: string;
          is_admin?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          channel_id?: string;
          user_id?: string;
          is_admin?: boolean;
          joined_at?: string;
          last_read_at?: string | null;
          is_active?: boolean;
        };
      };
      users: {
        Row: {
          id: string;
          nickname: string;
          email: string | null;
          profile_image_url: string | null;
          bio: string | null;
          team: string | null;
          is_private: boolean;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          email?: string | null;
          profile_image_url?: string | null;
          bio?: string | null;
          team?: string | null;
          is_private?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          email?: string | null;
          profile_image_url?: string | null;
          bio?: string | null;
          team?: string | null;
          is_private?: boolean;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

/**
 * Supabase 클라이언트 인스턴스 생성
 *
 * 설정:
 * - 자동 세션 새로고침 활성화
 * - localStorage를 통한 세션 지속성
 * - 실시간 기능 활성화
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "",
  {
    auth: {
      // 세션 자동 새로고침 설정
      autoRefreshToken: true,
      // 세션 지속성 설정 (웹: localStorage, 모바일: AsyncStorage)
      persistSession: true,
      // 탭 간 세션 동기화 설정 (웹만 해당)
      detectSessionInUrl: false,
    },
    // 실시간 연결 설정
    realtime: {
      // 자동 재연결 활성화
      params: {
        eventsPerSecond: 10,
      },
    },
    // 글로벌 설정
    global: {
      headers: {
        "x-application-name": "sportcomm-chat",
      },
    },
  }
);

/**
 * Supabase 연결 상태 확인
 * @returns Promise<boolean> 연결 성공 여부
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("users").select("count").limit(1);
    return !error;
  } catch (error) {
    console.error("Supabase 연결 확인 실패:", error);
    return false;
  }
};

/**
 * 현재 세션 정보 가져오기
 * @returns 현재 활성 세션 또는 null
 */
export const getCurrentSession = () => {
  return supabase.auth.getSession();
};

/**
 * 사용자 인증 상태 변경 리스너 등록
 * @param callback 인증 상태 변경 시 호출될 콜백 함수
 * @returns 구독 해제 함수
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange(callback);
};

/**
 * 실시간 채널 생성
 * @param channelName 채널 이름
 * @returns 실시간 채널 인스턴스
 */
export const createRealtimeChannel = (channelName: string) => {
  return supabase.channel(channelName, {
    config: {
      broadcast: { self: true },
      presence: { key: "user_id" },
    },
  });
};

// 에러 핸들링을 위한 유틸리티 함수들
export const handleSupabaseError = (error: any, context: string = "") => {
  console.error(`Supabase 에러 [${context}]:`, error);

  if (error?.code === "PGRST116") {
    throw new Error("요청한 데이터를 찾을 수 없습니다.");
  }

  if (error?.code === "23505") {
    throw new Error("이미 존재하는 데이터입니다.");
  }

  if (error?.code === "42501") {
    throw new Error("접근 권한이 없습니다.");
  }

  throw new Error(error?.message || "알 수 없는 오류가 발생했습니다.");
};

export default supabase;
