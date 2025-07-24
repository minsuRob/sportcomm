-- 채팅 테이블 스키마 설계
-- 요청 수 폭증 방지를 위한 최적화된 테이블 구조

-- 1. 채팅 채널 테이블
CREATE TABLE chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_private BOOLEAN DEFAULT FALSE,

  -- 성능 최적화를 위한 인덱스
  CONSTRAINT chat_channels_name_idx UNIQUE (name)
);
CREATE INDEX idx_chat_channels_created_at ON chat_channels(created_at);
CREATE INDEX idx_chat_channels_last_message_at ON chat_channels(last_message_at);

-- 2. 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_system BOOLEAN DEFAULT FALSE,

  -- 파티셔닝을 위한 월별 분할 키 (옵션)
  partition_key TEXT GENERATED ALWAYS AS (to_char(created_at, 'YYYY_MM')) STORED
);

-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_chat_messages_channel_created_at ON chat_messages(channel_id, created_at);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_reply_to ON chat_messages(reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX idx_chat_messages_partition_key ON chat_messages(partition_key);

-- 3. 채널 멤버십 테이블
CREATE TABLE chat_channel_members (
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX idx_chat_channel_members_user_id ON chat_channel_members(user_id);

-- 4. 첨부 파일 테이블 (옵션)
CREATE TABLE chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_chat_attachments_message_id ON chat_attachments(message_id);

-- 5. 안읽은 메시지 수 함수
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_channel_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_last_read TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 사용자가 마지막으로 읽은 시간 가져오기
  SELECT last_read_at INTO v_last_read
  FROM chat_channel_members
  WHERE user_id = p_user_id AND channel_id = p_channel_id;

  IF v_last_read IS NULL THEN
    RETURN 0;
  END IF;

  -- 안 읽은 메시지 수 계산
  SELECT COUNT(*) INTO v_count
  FROM chat_messages
  WHERE channel_id = p_channel_id
    AND created_at > v_last_read
    AND user_id != p_user_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Supabase Realtime을 위한 설정
-- 특정 테이블의 변경사항을 실시간으로 구독하기 위한 설정
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자가 속한 채널의 메시지만 볼 수 있도록 설정
CREATE POLICY "채널 멤버만 메시지 조회 가능"
  ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE user_id = auth.uid() AND channel_id = chat_messages.channel_id
    )
  );

-- RLS 정책: 채널 멤버만 메시지 작성 가능
CREATE POLICY "채널 멤버만 메시지 작성 가능"
  ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_channel_members
      WHERE user_id = auth.uid() AND channel_id = chat_messages.channel_id
    )
  );

-- 7. 채팅 관련 이벤트를 위한 트리거
CREATE OR REPLACE FUNCTION update_last_message_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- 채널의 마지막 메시지 정보 업데이트
  UPDATE chat_channels
  SET last_message = NEW.content,
      last_message_at = NEW.created_at
  WHERE id = NEW.channel_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_last_message_trigger();

-- 8. 메시지 저장 시 알림 발송 트리거 (옵션)
CREATE OR REPLACE FUNCTION send_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- 여기서 알림 로직 구현 또는 외부 알림 서비스 호출
  -- 예: INSERT INTO notifications(...) VALUES (...);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_send_message_notification
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION send_message_notification();

-- 9. 채팅방 초기화를 위한 저장 프로시저
CREATE OR REPLACE PROCEDURE init_chat_channel(
  p_name VARCHAR(255),
  p_description TEXT,
  p_created_by UUID,
  p_members UUID[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_channel_id UUID;
  v_member UUID;
BEGIN
  -- 채널 생성
  INSERT INTO chat_channels (name, description, created_by)
  VALUES (p_name, p_description, p_created_by)
  RETURNING id INTO v_channel_id;

  -- 멤버 추가
  FOREACH v_member IN ARRAY p_members
  LOOP
    INSERT INTO chat_channel_members (channel_id, user_id, is_admin)
    VALUES (v_channel_id, v_member, v_member = p_created_by);
  END LOOP;

  -- 시스템 메시지 추가
  INSERT INTO chat_messages (channel_id, user_id, content, is_system)
  VALUES (v_channel_id, p_created_by, '채팅방이 생성되었습니다.', TRUE);
END;
$$;

-- 10. 파티셔닝 설정 (대규모 시스템용, 선택사항)
-- 주의: 실제 파티셔닝을 적용하려면 테이블 생성 전에 설정해야 함
/*
CREATE TABLE chat_messages (
  id UUID NOT NULL,
  channel_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reply_to UUID,
  is_system BOOLEAN DEFAULT FALSE,
  partition_key TEXT GENERATED ALWAYS AS (to_char(created_at, 'YYYY_MM')) STORED
) PARTITION BY LIST (partition_key);

-- 최초 파티션 생성 (월별)
CREATE TABLE chat_messages_2023_08 PARTITION OF chat_messages
  FOR VALUES IN ('2023_08');

CREATE TABLE chat_messages_2023_09 PARTITION OF chat_messages
  FOR VALUES IN ('2023_09');
*/

-- 11. 오래된 메시지 삭제 또는 아카이빙 함수 (선택사항)
CREATE OR REPLACE PROCEDURE archive_old_messages(days INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 일정 기간 이상 지난 메시지를 아카이브 테이블로 이동
  INSERT INTO chat_messages_archive
  SELECT * FROM chat_messages
  WHERE created_at < NOW() - (days * INTERVAL '1 day');

  -- 이동된 메시지 삭제
  DELETE FROM chat_messages
  WHERE created_at < NOW() - (days * INTERVAL '1 day');
END;
$$;

-- 성능 관련 주석:
-- 1. 인덱스는 쿼리 패턴에 맞게 추가적으로 조정 필요
-- 2. 대규모 시스템의 경우 파티셔닝 전략 추가 검토 필요
-- 3. 채팅량이 매우 많은 경우 읽기/쓰기 분리 고려
-- 4. 메시지 테이블은 정기적으로 파티션 추가 및 관리 필요
