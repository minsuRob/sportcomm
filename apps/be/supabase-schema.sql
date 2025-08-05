-- Supabase 스키마 설정
-- 채팅 및 실시간 기능을 위한 테이블 구조

-- 1. 사용자 프로필 테이블
-- 로컬 DB의 사용자 정보와 동기화되는 최소한의 정보만 저장
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname VARCHAR(30) NOT NULL,
  profile_image_url VARCHAR(500),
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 채팅방 테이블
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100),
  type VARCHAR(20) NOT NULL DEFAULT 'DIRECT', -- DIRECT, GROUP, CHANNEL
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 채팅방 참여자 테이블
CREATE TABLE IF NOT EXISTS public.chat_room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- 4. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT', -- TEXT, IMAGE, FILE, SYSTEM
  reply_to_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON public.profiles(nickname);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON public.chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON public.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_is_active ON public.chat_rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON public.chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON public.chat_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_is_active ON public.chat_room_members(is_active);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_author_id ON public.chat_messages(author_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_message_id);

-- RLS (Row Level Security) 정책 설정
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 프로필 정책: 모든 사용자가 읽을 수 있고, 본인만 수정 가능
CREATE POLICY "프로필 조회 허용" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "본인 프로필 수정 허용" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 채팅방 정책: 참여자만 접근 가능
CREATE POLICY "채팅방 참여자만 조회 가능" ON public.chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members 
      WHERE room_id = id AND user_id = auth.uid() AND is_active = true
    )
  );

-- 채팅방 멤버 정책: 참여자만 조회 가능
CREATE POLICY "채팅방 멤버 조회 허용" ON public.chat_room_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members 
      WHERE room_id = chat_room_members.room_id AND user_id = auth.uid() AND is_active = true
    )
  );

-- 채팅 메시지 정책: 채팅방 참여자만 접근 가능
CREATE POLICY "채팅방 참여자만 메시지 조회 가능" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_room_members 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "채팅방 참여자만 메시지 작성 가능" ON public.chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.chat_room_members 
      WHERE room_id = chat_messages.room_id AND user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "본인 메시지만 수정 가능" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = author_id);

-- 실시간 구독을 위한 함수 생성
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 업데이트 트리거 생성
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 채팅 메시지 알림을 위한 함수
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- 새 메시지가 생성되면 채팅방의 모든 참여자에게 알림
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'room_id', NEW.room_id,
      'message_id', NEW.id,
      'author_id', NEW.author_id,
      'content', NEW.content,
      'created_at', NEW.created_at
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 새 메시지 알림 트리거
CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 초기 데이터 삽입 (선택사항)
-- 시스템 사용자 (봇, 공지사항 등)
-- INSERT INTO public.profiles (id, nickname, role, is_active) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'System', 'ADMIN', true)
-- ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.profiles IS '사용자 프로필 정보 (로컬 DB와 동기화)';
COMMENT ON TABLE public.chat_rooms IS '채팅방 정보';
COMMENT ON TABLE public.chat_room_members IS '채팅방 참여자 정보';
COMMENT ON TABLE public.chat_messages IS '채팅 메시지';

COMMENT ON COLUMN public.profiles.id IS 'Supabase Auth 사용자 ID';
COMMENT ON COLUMN public.profiles.nickname IS '사용자 닉네임 (로컬 DB와 동기화)';
COMMENT ON COLUMN public.profiles.role IS '사용자 역할 (USER, INFLUENCER, ADMIN)';

COMMENT ON COLUMN public.chat_messages.message_type IS '메시지 타입 (TEXT, IMAGE, FILE, SYSTEM)';
COMMENT ON COLUMN public.chat_messages.reply_to_message_id IS '답글 대상 메시지 ID';