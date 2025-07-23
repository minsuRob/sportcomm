import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * PostLike 테이블 생성 마이그레이션
 *
 * 게시물 좋아요 기능을 위한 테이블을 생성하고,
 * 사용자 ID와 게시물 ID에 유니크 제약조건을 설정하여 중복 좋아요를 방지합니다.
 */
export class CreatePostLikeTable1689566271000 implements MigrationInterface {
  /**
   * 마이그레이션 실행 메서드
   * @param queryRunner - 쿼리 실행기
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // post_likes 테이블 생성
    await queryRunner.createTable(
      new Table({
        name: 'post_likes',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            comment: '고유 식별자',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
            comment: '좋아요를 누른 사용자 ID',
          },
          {
            name: 'postId',
            type: 'uuid',
            isNullable: false,
            comment: '좋아요가 달린 게시물 ID',
          },
          {
            name: 'isLikeActive',
            type: 'boolean',
            default: true,
            comment: '좋아요 활성 상태',
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
            comment: '생성 일시',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
            comment: '수정 일시',
          },
          {
            name: 'deletedAt',
            type: 'timestamptz',
            isNullable: true,
            comment: '삭제 일시',
          },
        ],
      }),
      true
    );

    // 인덱스 생성
    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'IDX_POST_LIKES_USER_ID',
        columnNames: ['userId'],
      })
    );

    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'IDX_POST_LIKES_POST_ID',
        columnNames: ['postId'],
      })
    );

    await queryRunner.createIndex(
      'post_likes',
      new TableIndex({
        name: 'IDX_POST_LIKES_IS_ACTIVE',
        columnNames: ['isLikeActive'],
      })
    );

    // 외래키 생성
    await queryRunner.createForeignKey(
      'post_likes',
      new TableForeignKey({
        name: 'FK_POST_LIKES_USER_ID',
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'post_likes',
      new TableForeignKey({
        name: 'FK_POST_LIKES_POST_ID',
        columnNames: ['postId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'posts',
        onDelete: 'CASCADE',
      })
    );

    // 유니크 제약조건 생성 (중복 좋아요 방지)
    await queryRunner.query(
      'ALTER TABLE post_likes ADD CONSTRAINT "UQ_POST_LIKES_USER_POST" UNIQUE ("userId", "postId")'
    );

    console.log('✅ PostLike 테이블 생성 완료');
  }

  /**
   * 마이그레이션 롤백 메서드
   * @param queryRunner - 쿼리 실행기
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 외래키 삭제
    await queryRunner.dropForeignKey('post_likes', 'FK_POST_LIKES_POST_ID');
    await queryRunner.dropForeignKey('post_likes', 'FK_POST_LIKES_USER_ID');

    // 인덱스 삭제
    await queryRunner.dropIndex('post_likes', 'IDX_POST_LIKES_IS_ACTIVE');
    await queryRunner.dropIndex('post_likes', 'IDX_POST_LIKES_POST_ID');
    await queryRunner.dropIndex('post_likes', 'IDX_POST_LIKES_USER_ID');

    // 테이블 삭제
    await queryRunner.dropTable('post_likes');

    console.log('✅ PostLike 테이블 롤백 완료');
  }
}
