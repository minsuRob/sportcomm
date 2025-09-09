import { createClient } from "@supabase/supabase-js";
import { isWeb } from "@/lib/platform";

// SSR 환경에서는 AsyncStorage를 조건부로 import
let AsyncStorage: any = null;
if (!isWeb() && typeof window !== "undefined") {
  try {
    AsyncStorage = require("@react-native-async-storage/async-storage").default;
  } catch (error) {
    console.warn("AsyncStorage를 로드할 수 없습니다:", error);
  }
}

import {
  SUPABASE_URL as ENV_SUPABASE_URL,
  SUPABASE_ANON_KEY as ENV_SUPABASE_ANON_KEY,
} from "@env";

// Supabase 연결 정보 (iikgupdmnlmhycmtuqzj 프로젝트 사용)
const SUPABASE_URL = ENV_SUPABASE_URL;
const SUPABASE_ANON_KEY = ENV_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Supabase URL and Anon Key must be provided in environment variables.",
  );
}
console.log("환경변수로 바꾸세요!! Supabase 클라이언트 초기화:", {
  url: SUPABASE_URL,
  keyLength: SUPABASE_ANON_KEY.length,
});

// Supabase 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: string;
          isRoomActive: boolean;
          maxParticipants: number;
          currentParticipants: number;
          lastMessageContent: string | null;
          lastMessageAt: string | null;
          createdAt: string;
          updatedAt: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          type?: string;
          isRoomActive?: boolean;
          maxParticipants?: number;
          currentParticipants?: number;
          lastMessageContent?: string | null;
          lastMessageAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          type?: string;
          isRoomActive?: boolean;
          maxParticipants?: number;
          currentParticipants?: number;
          lastMessageContent?: string | null;
          lastMessageAt?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          roomId: string;
          authorId: string;
          content: string;
          createdAt: string;
          updatedAt: string;
          replyToMessageId: string | null;
          type: string;
        };
        Insert: {
          id?: string;
          roomId: string;
          authorId: string;
          content: string;
          createdAt?: string;
          updatedAt?: string;
          replyToMessageId?: string | null;
          type?: string;
        };
        Update: {
          id?: string;
          roomId?: string;
          authorId?: string;
          content?: string;
          createdAt?: string;
          updatedAt?: string;
          replyToMessageId?: string | null;
          type?: string;
        };
      };
      chat_room_participants: {
        Row: {
          roomId: string;
          userId: string;
        };
        Insert: {
          roomId: string;
          userId: string;
        };
        Update: {
          roomId?: string;
          userId?: string;
        };
        // 중복된 Update 정의 제거 (채널 관련 필드) - 타입 충돌 해결
      };
      users: {
        Row: {
          id: string;
          nickname: string;
          email: string | null;
          profileImageUrl: string | null;
          bio: string | null;
          role: string;
          createdAt: string;
          updatedAt: string;
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
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage || undefined, // SSR 환경에서는 undefined
      autoRefreshToken: typeof window !== "undefined", // SSR 환경에서는 비활성화
      persistSession: typeof window !== "undefined", // SSR 환경에서는 비활성화
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
  },
);

/**
 * Supabase 연결 상태 확인
 * @returns Promise<boolean> 연결 성공 여부
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // 단순한 health check 쿼리로 변경
    const { data, error } = await supabase.from("users").select("id").limit(1);

    if (error) {
      console.error("Supabase 연결 확인 실패:", error);
      return false;
    }

    console.log("Supabase 연결 성공");
    return true;
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
/**
 * @deprecated 중복 Auth 이벤트 리스너가 발생할 수 있으므로 사용을 지양하세요.
 * Supabase auto refresh + 중앙 AuthEventListener (auth-listener.ts) 또는
 * 직접 supabase.auth.onAuthStateChange 사용을 권장합니다.
 * 추후 제거 예정.
 */
export const onAuthStateChange = (
  callback: (event: string, session: any) => void,
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

/**
 * Supabase 클라이언트 초기화 및 연결 테스트
 * 앱 시작 시 호출하여 연결 상태를 확인합니다.
 * @returns Promise<void>
 */
export const initializeSupabase = async (): Promise<void> => {
  try {
    console.log("Supabase 클라이언트 초기화 중...");
    console.log("URL:", SUPABASE_URL);
    console.log("Key 존재 여부:", !!SUPABASE_ANON_KEY);

    const isConnected = await checkSupabaseConnection();

    if (isConnected) {
      console.log("✅ Supabase 연결 성공");
    } else {
      console.warn("⚠️ Supabase 연결 실패 - 오프라인 모드로 동작");
    }
  } catch (error) {
    console.error("❌ Supabase 초기화 실패:", error);
    throw error;
  }
};

/**
 * 개발 환경에서 Supabase 상태 정보 출력
 * @returns Promise<void>
 */
export const debugSupabaseStatus = async (): Promise<void> => {
  if (__DEV__) {
    try {
      const session = await getCurrentSession();
      const isConnected = await checkSupabaseConnection();

      console.log("🔍 Supabase 디버그 정보:", {
        연결상태: isConnected ? "연결됨" : "연결안됨",
        URL: SUPABASE_URL,
        세션존재: !!session.data.session,
        사용자ID: session.data.session?.user?.id || "없음",
      });
    } catch (error) {
      console.error("디버그 정보 수집 실패:", error);
    }
  }
};

export default supabase;
