import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * users 테이블에 추천인 코드 관련 컬럼들 추가
 *
 * 추가되는 컬럼들:
 * - referralCode: varchar(8), unique, not null - 사용자의 추천인 코드 (8글자 대문자 UUID)
 * - referredBy: varchar(8), nullable - 추천인 코드 (나를 초대한 사람의 추천인 코드)
 *
 * 참고:
 * - 기존 사용자들에게는 마이그레이션 시점에 고유한 추천인 코드를 생성하여 할당합니다.
 * - referralCode는 UNIQUE 제약조건이 있으므로 중복되지 않도록 생성해야 합니다.
 */
export class AddReferralCode1705130000001 implements MigrationInterface {
  name = 'AddReferralCode1705130000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. referralCode 컬럼을 nullable로 먼저 추가
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "referralCode" varchar(8);
    `);

    // 2. referredBy 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "referredBy" varchar(8);
    `);

    // 3. 기존 사용자들에게 고유한 추천인 코드 생성 및 할당
    await queryRunner.query(`
      UPDATE "users"
      SET "referralCode" = UPPER(SUBSTRING(MD5(RANDOM()::text || id::text) FROM 1 FOR 8))
      WHERE "referralCode" IS NULL;
    `);

    // 4. 중복된 추천인 코드가 있을 경우 재생성 (드물지만 안전을 위해)
    await queryRunner.query(`
      UPDATE "users" u1
      SET "referralCode" = UPPER(SUBSTRING(MD5(RANDOM()::text || u1.id::text || u1."createdAt"::text) FROM 1 FOR 8))
      WHERE EXISTS (
        SELECT 1 FROM "users" u2
        WHERE u2."referralCode" = u1."referralCode" AND u2.id != u1.id
      );
    `);

    // 5. 이제 NOT NULL 제약조건과 UNIQUE 제약조건 추가
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "referralCode" SET NOT NULL,
      ADD CONSTRAINT "UQ_users_referralCode" UNIQUE ("referralCode");
    `);

    // 컬럼 주석 추가
    await queryRunner.query(`
      COMMENT ON COLUMN "users"."referralCode"
      IS '사용자 추천인 코드 (8글자 대문자 UUID)';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "users"."referredBy"
      IS '추천인 코드 (나를 초대한 사람의 추천인 코드)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 컬럼 제거 (존재할 때만)
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "referredBy";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "referralCode";
    `);
  }
}
