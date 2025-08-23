import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamPaletteColors1705120000000 implements MigrationInterface {
  name = 'AddTeamPaletteColors1705120000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS "mainColor" VARCHAR(7) DEFAULT '#FFFFFF',
      ADD COLUMN IF NOT EXISTS "subColor" VARCHAR(7) DEFAULT '#4E6A89',
      ADD COLUMN IF NOT EXISTS "darkMainColor" VARCHAR(7) DEFAULT '#1E252E',
      ADD COLUMN IF NOT EXISTS "darkSubColor" VARCHAR(7) DEFAULT '#2C3947';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE teams
      DROP COLUMN IF EXISTS "darkSubColor",
      DROP COLUMN IF EXISTS "darkMainColor",
      DROP COLUMN IF EXISTS "subColor",
      DROP COLUMN IF EXISTS "mainColor";
    `);
  }
}