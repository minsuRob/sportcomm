import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Supabase 사용자 ID 필드 추가 마이그레이션
 *
 * 기존 사용자 테이블에 Supabase 연동을 위한 supabase_user_id 컬럼을 추가합니다.
 * 채팅 및 실시간 기능을 위한 Supabase 연동에 사용됩니다.
 */
export class AddSupabaseUserId1704067200000 implements MigrationInterface {
  name = 'AddSupabaseUserId1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // supabase_user_id 컬럼 추가
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'supabase_user_id',
        type: 'uuid',
        isNullable: true,
        isUnique: true,
        comment: 'Supabase 사용자 ID (채팅 연동용)',
      }),
    );

    // 인덱스 추가
    await queryRunner.query(`
      CREATE INDEX "idx_user_supabase_id" ON "users" ("supabase_user_id")
    `);

    console.log('✅ Supabase 사용자 ID 컬럼이 추가되었습니다.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 제거
    await queryRunner.query(`DROP INDEX "idx_user_supabase_id"`);

    // 컬럼 제거
    await queryRunner.dropColumn('users', 'supabase_user_id');

    console.log('✅ Supabase 사용자 ID 컬럼이 제거되었습니다.');
  }
}
