-- 002_add_team_palette_colors.sql
-- 팀 팔레트 컬러 확장 마이그레이션
-- 목적:
--   1) 기존 단일 color 컬럼에서 확장된 4가지 팔레트 컬럼(mainColor, subColor, darkMainColor, darkSubColor) 추가
--   2) 기존 데이터 하위 호환을 위해 color 값을 기반으로 신규 컬럼 채우기
--   3) 향후 UI(라이트/다크 테마)에서 팀 브랜딩 컬러 세분화 활용
--
-- 주의:
--   - 기존 color 컬럼은 nullable 로 변경될 수 있으나 여기서는 건드리지 않음 (엔티티에서 nullable 처리)
--   - 다운 마이그레이션 시 신규 컬럼만 제거 (데이터 손실 주의)
--
-- 실행 환경: PostgreSQL

BEGIN;

-- ===========================
-- 업(Up) 마이그레이션
-- ===========================

-- 1. 신규 컬럼 추가 (기본값과 함께)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS "mainColor"      VARCHAR(7) DEFAULT '#FFFFFF',
  ADD COLUMN IF NOT EXISTS "subColor"       VARCHAR(7) DEFAULT '#4E6A89',
  ADD COLUMN IF NOT EXISTS "darkMainColor"  VARCHAR(7) DEFAULT '#1E252E',
  ADD COLUMN IF NOT EXISTS "darkSubColor"   VARCHAR(7) DEFAULT '#2C3947';

UPDATE teams
SET
  "mainColor" = COALESCE("mainColor", '#FFFFFF'),
  "subColor" = COALESCE("subColor", '#4E6A89'),
  "darkMainColor" = COALESCE("darkMainColor", '#1E252E'),
  "darkSubColor" = COALESCE("darkSubColor", '#2C3947');

-- 2. 데이터 백필 (기존 color → 신규 팔레트)
--    - mainColor: 기존 color 또는 기본값(#344155)
--    - subColor:  mainColor 와 동일(추후 관리자가 조정)
--    - darkMainColor: mainColor (향후 수동 조정)
--    - darkSubColor: subColor (향후 수동 조정)

-- 3. NOT NULL 제약 적용 (데이터 채운 후)
ALTER TABLE teams
  ALTER COLUMN "mainColor"     SET NOT NULL,
  ALTER COLUMN "subColor"      SET NOT NULL,
  ALTER COLUMN "darkMainColor" SET NOT NULL,
  ALTER COLUMN "darkSubColor"  SET NOT NULL;

-- 4. 기본값 제거 (NOT NULL 제약 후)
ALTER TABLE teams
  ALTER COLUMN "mainColor"     DROP DEFAULT,
  ALTER COLUMN "subColor"      DROP DEFAULT,
  ALTER COLUMN "darkMainColor" DROP DEFAULT,
  ALTER COLUMN "darkSubColor"  DROP DEFAULT;

-- 5. 컬럼 주석 추가
COMMENT ON COLUMN teams."mainColor"     IS '라이트 테마 메인 색상 (HEX)';
COMMENT ON COLUMN teams."subColor"      IS '라이트 테마 서브 색상 (HEX)';
COMMENT ON COLUMN teams."darkMainColor" IS '다크 테마 메인 색상 (HEX)';
COMMENT ON COLUMN teams."darkSubColor"  IS '다크 테마 서브 색상 (HEX)';

COMMIT;

-- ===========================
-- 다운(Down) 마이그레이션
-- (주의: 팔레트 컬러 데이터 삭제됨)
-- ===========================
-- 필요 시 수동 실행:
-- BEGIN;
-- ALTER TABLE teams
--   DROP COLUMN IF EXISTS "darkSubColor",
--   DROP COLUMN IF EXISTS "darkMainColor",
--   DROP COLUMN IF EXISTS "subColor",
--   DROP COLUMN IF EXISTS "mainColor";
-- COMMIT;
