import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * users 테이블에 인증 제공자 enum 컬럼(provider) 추가
 *
 * - enum 타입명: users_provider_enum
 * - 값: 'EMAIL', 'GOOGLE', 'APPLE', 'KAKAO', 'UNKNOWN'
 * - 기본값: 'UNKNOWN'
 *
 * 참고:
 * - 기존 데이터는 기본값(UNKNOWN)으로 채워집니다.
 * - Postgres의 ENUM 타입은 IF NOT EXISTS를 직접 지원하지 않으므로 DO 블록으로 존재 여부 체크 후 생성합니다.
 */
export class AddUserProviderEnum1705130000000 implements MigrationInterface {
  name = 'AddUserProviderEnum1705130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ENUM 타입 생성 (존재 여부 확인 후 생성)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_provider_enum') THEN
          CREATE TYPE "users_provider_enum" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE', 'KAKAO', 'UNKNOWN');
        END IF;
      END
      $$;
    `);

    // users.provider 컬럼 추가 (존재하지 않을 때만)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "provider" "users_provider_enum" NOT NULL DEFAULT 'UNKNOWN';
    `);

    // 컬럼 주석 추가
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."provider"
      IS '인증 제공자 (AuthProvider: EMAIL, GOOGLE, APPLE, KAKAO, UNKNOWN)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 컬럼 제거 (존재할 때만)
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "provider";
    `);

    // ENUM 타입 제거 (존재할 때만)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_provider_enum') THEN
          DROP TYPE "users_provider_enum";
        END IF;
      END
      $$;
    `);
  }
}
