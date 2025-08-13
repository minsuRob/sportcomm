-- 채팅방에 팀 연결 기능 추가 마이그레이션
-- 작성일: 2025-01-13
-- 설명: ChatRoom 엔티티에 teamId 컬럼을 추가하여 팀별 채팅방 기능 구현

-- 1. chat_rooms 테이블에 teamId 컬럼 추가
ALTER TABLE chat_rooms 
ADD COLUMN "teamId" uuid NULL;

-- 2. 외래키 제약조건 추가 (teams 테이블과 연결)
ALTER TABLE chat_rooms 
ADD CONSTRAINT "FK_chat_rooms_team" 
FOREIGN KEY ("teamId") REFERENCES teams(id) 
ON DELETE SET NULL;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX "IDX_chat_rooms_teamId" ON chat_rooms ("teamId");

-- 4. 복합 인덱스 추가 (팀별 활성 채팅방 조회 최적화)
CREATE INDEX "IDX_chat_rooms_team_active" ON chat_rooms ("teamId", "isRoomActive");

-- 5. 기존 채팅방들은 공용 채팅방으로 설정 (teamId = NULL)
-- 별도 작업 불필요 (기본값이 NULL)

-- 6. 주석 추가
COMMENT ON COLUMN chat_rooms."teamId" IS '연결된 팀 ID (NULL이면 공용 채팅방)';