import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * user_teams 테이블에 최애 선수 정보 컬럼 추가
 *
 * - favoritePlayerName (varchar(50), nullable)
 * - favoritePlayerNumber (int, nullable)
 *
 * 롤백 시 두 컬럼을 제거합니다.
 *
 * 주의:
 *  - 운영 환경에서 데이터 손실 방지를 위해 down() 실행 전 백업 고려
 */
export class AddUserTeamFavoritePlayer1705125000000 implements MigrationInterface {
  name = 'AddUserTeamFavoritePlayer1705125000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_teams
      ADD COLUMN IF NOT EXISTS "favoritePlayerName" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "favoritePlayerNumber" INT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_teams
      DROP COLUMN IF EXISTS "favoritePlayerNumber",
      DROP COLUMN IF EXISTS "favoritePlayerName";
    `);
  }
}
