import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 일일 제한 시스템을 개수 기반에서 포인트 기반으로 변경
 *
 * 기존 필드:
 * - dailyChatCount: 일일 채팅 메시지 개수
 * - dailyPostCount: 일일 게시물 작성 개수
 *
 * 새로운 필드:
 * - dailyChatPoints: 일일 댓글 포인트 (최대 10점)
 * - dailyPostPoints: 일일 게시물 포인트 (최대 50점)
 */
export class UpdateDailyLimitsToPoints1699000000001 implements MigrationInterface {
  name = 'UpdateDailyLimitsToPoints1699000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 기존 dailyChatCount 필드를 dailyChatPoints로 변경
    await queryRunner.renameColumn('users', 'dailyChatCount', 'dailyChatPoints');

    // 기존 dailyPostCount 필드를 dailyPostPoints로 변경
    await queryRunner.renameColumn('users', 'dailyPostCount', 'dailyPostPoints');

    // dailyChatPoints 필드의 주석 업데이트
    await queryRunner.query(`
      COMMENT ON COLUMN users."dailyChatPoints" IS '일일 댓글 포인트 (최대 10점 제한)'
    `);

    // dailyPostPoints 필드의 주석 업데이트
    await queryRunner.query(`
      COMMENT ON COLUMN users."dailyPostPoints" IS '일일 게시물 포인트 (최대 50점 제한)'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 시 필드명을 원래대로 변경
    await queryRunner.renameColumn('users', 'dailyChatPoints', 'dailyChatCount');
    await queryRunner.renameColumn('users', 'dailyPostPoints', 'dailyPostCount');

    // 원래 주석으로 복원
    await queryRunner.query(`
      COMMENT ON COLUMN users."dailyChatCount" IS '일일 채팅 메시지 개수 (최대 30회 제한)'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN users."dailyPostCount" IS '일일 게시물 작성 개수 (최대 50회 제한)'
    `);
  }
}
