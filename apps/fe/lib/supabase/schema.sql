-- ============================================================================
-- Sportcomm 채팅 시스템 데이터베이스 스키마
-- ============================================================================

-- UUID 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. 사용자 테이블 (기존 사용자 시스템과 연동)
-- ============================================================================

-- 사용자 테이블 (이미 존재한다면 스키마만 확인)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nickname VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE,
    profile_image_url TEXT,
    bio TEXT,
    team VARCHAR(100),
    is_private BOOLEAN DEFAULT false,
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON public.users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- 2. 채팅방 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT false,
    type VARCHAR(20) DEFAULT 'GENERAL', -- GENERAL, TEAM, DIRECT, EVENT
    is_room_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 100,
    current_participants INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE
);

-- 채팅방 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON public.chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_is_private ON public.chat_channels(is_private);
CREATE INDEX IF NOT EXISTS idx_chat_channels_is_active ON public.chat_channels(is_room_active);
CREATE INDEX IF NOT EXISTS idx_chat_channels_created_by ON public.chat_channels(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_channels_last_message_at ON public.chat_channels(last_message_at);

-- ============================================================================
-- 3. 채팅방 멤버 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_channel_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(channel_id, user_id)
);

-- 채팅방 멤버 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_channel_id ON public.chat_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_user_id ON public.chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channel_members_is_active ON public.chat_channel_members(is_active);

-- ============================================================================
-- 4. 채팅 메시지 테이블
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    is_system BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false
);

-- 채팅 메시지 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to_id ON public.chat_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted ON public.chat_messages(is_deleted);

-- ============================================================================
-- 5. 메시지 첨부파일 테이블 (향후 확장)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 메시지 첨부파일 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_message_attachments_message_id ON public.chat_message_attachments(message_id);

-- ============================================================================
-- 6. 트리거 함수 정의
-- ============================================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 채팅방 멤버 수 업데이트 함수
CREATE OR REPLACE FUNCTION update_channel_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.chat_channels
        SET current_participants = (
            SELECT COUNT(*)
            FROM public.chat_channel_members
            WHERE channel_id = NEW.channel_id AND is_active = true
        )
        WHERE id = NEW.channel_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.chat_channels
        SET current_participants = (
            SELECT COUNT(*)
            FROM public.chat_channel_members
            WHERE channel_id = NEW.channel_id AND is_active = true
        )
        WHERE id = NEW.channel_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.chat_channels
        SET current_participants = (
            SELECT COUNT(*)
            FROM public.chat_channel_members
            WHERE channel_id = OLD.channel_id AND is_active = true
        )
        WHERE id = OLD.channel_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- 채팅방 마지막 메시지 업데이트 함수
CREATE OR REPLACE FUNCTION update_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.chat_channels
        SET
            last_message = NEW.content,
            last_message_at = NEW.created_at
        WHERE id = NEW.channel_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 7. 트리거 설정
-- ============================================================================

-- updated_at 자동 업데이트 트리거들
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER update_chat_channels_updated_at
    BEFORE UPDATE ON public.chat_channels
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 채팅방 멤버 수 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_participant_count ON public.chat_channel_members;
CREATE TRIGGER trigger_update_participant_count
    AFTER INSERT OR UPDATE OR DELETE ON public.chat_channel_members
    FOR EACH ROW
    EXECUTE PROCEDURE update_channel_participant_count();

-- 채팅방 마지막 메시지 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_last_message ON public.chat_messages;
CREATE TRIGGER trigger_update_last_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE PROCEDURE update_channel_last_message();

-- ============================================================================
-- 8. Row Level Security (RLS) 정책
-- ============================================================================

-- RLS 활성화
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;

-- 채팅방 접근 정책
DROP POLICY IF EXISTS "채팅방 조회 정책" ON public.chat_channels;
CREATE POLICY "채팅방 조회 정책" ON public.chat_channels
    FOR SELECT USING (
        -- 공개 채팅방이거나
        (is_private = false AND is_room_active = true) OR
        -- 채팅방 멤버이거나
        id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_active = true
        ) OR
        -- 채팅방 생성자인 경우
        created_by = auth.uid()
    );

DROP POLICY IF EXISTS "채팅방 생성 정책" ON public.chat_channels;
CREATE POLICY "채팅방 생성 정책" ON public.chat_channels
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "채팅방 수정 정책" ON public.chat_channels;
CREATE POLICY "채팅방 수정 정책" ON public.chat_channels
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_admin = true AND is_active = true
        )
    );

-- 채팅방 멤버 접근 정책
DROP POLICY IF EXISTS "채팅방 멤버 조회 정책" ON public.chat_channel_members;
CREATE POLICY "채팅방 멤버 조회 정책" ON public.chat_channel_members
    FOR SELECT USING (
        -- 본인이거나
        user_id = auth.uid() OR
        -- 같은 채팅방 멤버인 경우
        channel_id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "채팅방 멤버 추가 정책" ON public.chat_channel_members;
CREATE POLICY "채팅방 멤버 추가 정책" ON public.chat_channel_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR
        channel_id IN (
            SELECT id FROM public.chat_channels WHERE created_by = auth.uid()
        ) OR
        channel_id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_admin = true AND is_active = true
        )
    );

-- 채팅 메시지 접근 정책
DROP POLICY IF EXISTS "채팅 메시지 조회 정책" ON public.chat_messages;
CREATE POLICY "채팅 메시지 조회 정책" ON public.chat_messages
    FOR SELECT USING (
        channel_id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "채팅 메시지 생성 정책" ON public.chat_messages;
CREATE POLICY "채팅 메시지 생성 정책" ON public.chat_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        channel_id IN (
            SELECT channel_id FROM public.chat_channel_members
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "채팅 메시지 수정 정책" ON public.chat_messages;
CREATE POLICY "채팅 메시지 수정 정책" ON public.chat_messages
    FOR UPDATE USING (user_id = auth.uid());

-- 메시지 첨부파일 접근 정책
DROP POLICY IF EXISTS "첨부파일 조회 정책" ON public.chat_message_attachments;
CREATE POLICY "첨부파일 조회 정책" ON public.chat_message_attachments
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.chat_messages
            WHERE channel_id IN (
                SELECT channel_id FROM public.chat_channel_members
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- ============================================================================
-- 9. 실시간 구독 설정
-- ============================================================================

-- 실시간 Publication 생성 (모든 테이블에 대해)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments;

-- ============================================================================
-- 10. 샘플 데이터 (개발 환경용)
-- ============================================================================

-- 시스템 사용자 생성 (존재하지 않는 경우만)
INSERT INTO public.users (id, nickname, email, role, is_private)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '시스템',
    'system@sportcomm.app',
    'SYSTEM',
    false
)
ON CONFLICT (id) DO NOTHING;

-- 기본 공개 채팅방 생성
INSERT INTO public.chat_channels (id, name, description, type, is_private, created_by)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '전체 채팅',
    '모든 사용자가 참여할 수 있는 공개 채팅방입니다.',
    'GENERAL',
    false,
    '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

-- 공지사항 채팅방 생성
INSERT INTO public.chat_channels (id, name, description, type, is_private, created_by)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '공지사항',
    '중요한 공지사항을 확인할 수 있는 채팅방입니다.',
    'ANNOUNCEMENT',
    false,
    '00000000-0000-0000-0000-000000000000'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. 유용한 뷰 (View) 정의
-- ============================================================================

-- 채팅방 상세 정보 뷰 (멤버 수, 마지막 메시지 등 포함)
CREATE OR REPLACE VIEW public.chat_channels_with_details AS
SELECT
    c.*,
    (
        SELECT COUNT(*)
        FROM public.chat_channel_members ccm
        WHERE ccm.channel_id = c.id AND ccm.is_active = true
    ) as member_count,
    (
        SELECT COUNT(*)
        FROM public.chat_messages cm
        WHERE cm.channel_id = c.id
        AND cm.created_at > COALESCE(
            (
                SELECT last_read_at
                FROM public.chat_channel_members
                WHERE channel_id = c.id AND user_id = auth.uid()
            ),
            '1970-01-01'::timestamptz
        )
        AND cm.is_deleted = false
    ) as unread_count
FROM public.chat_channels c;

-- 사용자별 채팅방 목록 뷰
CREATE OR REPLACE VIEW public.user_chat_channels AS
SELECT
    c.*,
    ccm.is_admin,
    ccm.joined_at,
    ccm.last_read_at,
    (
        SELECT COUNT(*)
        FROM public.chat_messages cm
        WHERE cm.channel_id = c.id
        AND cm.created_at > COALESCE(ccm.last_read_at, '1970-01-01'::timestamptz)
        AND cm.is_deleted = false
    ) as unread_count
FROM public.chat_channels c
JOIN public.chat_channel_members ccm ON c.id = ccm.channel_id
WHERE ccm.user_id = auth.uid() AND ccm.is_active = true;

-- ============================================================================
-- 12. 유틸리티 함수들
-- ============================================================================

-- 사용자가 채팅방 멤버인지 확인하는 함수
CREATE OR REPLACE FUNCTION public.is_channel_member(channel_id UUID, user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.chat_channel_members
        WHERE channel_id = $1 AND user_id = $2 AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 채팅방 읽음 상태 업데이트 함수
CREATE OR REPLACE FUNCTION public.mark_channel_as_read(channel_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.chat_channel_members
    SET last_read_at = NOW()
    WHERE channel_id = $1 AND user_id = auth.uid() AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 스키마 설정 완료
-- ============================================================================

COMMENT ON TABLE public.chat_channels IS '채팅방 정보를 저장하는 테이블';
COMMENT ON TABLE public.chat_channel_members IS '채팅방 멤버 정보를 저장하는 테이블';
COMMENT ON TABLE public.chat_messages IS '채팅 메시지를 저장하는 테이블';
COMMENT ON TABLE public.chat_message_attachments IS '메시지 첨부파일 정보를 저장하는 테이블';
