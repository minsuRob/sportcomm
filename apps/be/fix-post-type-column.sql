-- Post 테이블의 type 컬럼 문제 해결 스크립트
-- 이 스크립트를 데이터베이스에서 직접 실행하세요

-- 1. 기존 type 컬럼이 있다면 제거 (오류가 발생할 수 있으므로 주의)
-- ALTER TABLE posts DROP COLUMN IF EXISTS type;

-- 2. type 컬럼을 nullable로 추가
ALTER TABLE posts ADD COLUMN IF NOT EXISTS type character varying(50);

-- 3. 기존 데이터에 기본값 설정
UPDATE posts SET type = 'ANALYSIS' WHERE type IS NULL;

-- 4. NOT NULL 제약조건 추가
ALTER TABLE posts ALTER COLUMN type SET NOT NULL;

-- 5. 기본값 설정
ALTER TABLE posts ALTER COLUMN type SET DEFAULT 'ANALYSIS';

-- 6. 컬럼 코멘트 추가
COMMENT ON COLUMN posts.type IS '게시물 타입 (ANALYSIS, CHEERING, HIGHLIGHT)';

-- 확인 쿼리
SELECT COUNT(*) as total_posts, type, COUNT(*) as count_by_type 
FROM posts 
GROUP BY type;