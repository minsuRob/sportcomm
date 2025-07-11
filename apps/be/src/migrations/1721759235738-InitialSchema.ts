import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1721759235738 implements MigrationInterface {
  name = 'InitialSchema1721759235738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID generation extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create custom ENUM types
    await queryRunner.query(
      `CREATE TYPE "public"."user_role_enum" AS ENUM('USER', 'INFLUENCER', 'ADMIN')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."post_type_enum" AS ENUM('ANALYSIS', 'CHEERING', 'HIGHLIGHT')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."media_type_enum" AS ENUM('IMAGE', 'VIDEO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."upload_status_enum" AS ENUM('UPLOADING', 'COMPLETED', 'FAILED')`,
    );

    // Create 'user' table
    await queryRunner.query(
      `CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "nickname" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'USER',
        CONSTRAINT "UQ_e2364281027b926b879fa2fa1e0" UNIQUE ("nickname"),
        CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"),
        CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
      )`,
    );

    // Create 'post' table
    await queryRunner.query(
      `CREATE TABLE "post" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "content" text NOT NULL,
        "type" "public"."post_type_enum" NOT NULL,
        "version" integer NOT NULL DEFAULT 1,
        "authorId" uuid,
        CONSTRAINT "PK_be5fda3aac270b134ff9c21cdee" PRIMARY KEY ("id")
      )`,
    );

    // Create 'post_version' table
    await queryRunner.query(
      `CREATE TABLE "post_version" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "content" text NOT NULL,
        "version" integer NOT NULL,
        "postId" uuid,
        CONSTRAINT "PK_d8995094282b79a597a7a424a18" PRIMARY KEY ("id")
      )`,
    );

    // Create 'comment' table
    await queryRunner.query(
      `CREATE TABLE "comment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "content" character varying NOT NULL,
        "authorId" uuid,
        "postId" uuid,
        "parentCommentId" uuid,
        CONSTRAINT "PK_0b0e4b263a58afc65742858b503" PRIMARY KEY ("id")
      )`,
    );

    // Create 'follow' table
    await queryRunner.query(
      `CREATE TABLE "follow" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "followerId" uuid NOT NULL,
        "followingId" uuid NOT NULL,
        CONSTRAINT "UQ_b952f43702598a9775316f4618e" UNIQUE ("followerId", "followingId"),
        CONSTRAINT "PK_fda88bc28a84d2d6d06e456c56b" PRIMARY KEY ("id")
      )`,
    );

    // Create 'media' table
    await queryRunner.query(
      `CREATE TABLE "media" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "url" character varying NOT NULL,
        "type" "public"."media_type_enum" NOT NULL,
        "status" "public"."upload_status_enum" NOT NULL,
        "postId" uuid,
        CONSTRAINT "PK_f4e0fcac36e050de337b670d8bd" PRIMARY KEY ("id")
      )`,
    );

    // Create 'chat_room' table
    await queryRunner.query(
      `CREATE TABLE "chat_room" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying,
        CONSTRAINT "PK_3f14a085dadd2b694855d0107c8" PRIMARY KEY ("id")
      )`,
    );

    // Create 'chat_message' table
    await queryRunner.query(
      `CREATE TABLE "chat_message" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "content" text NOT NULL,
        "authorId" uuid,
        "roomId" uuid,
        CONSTRAINT "PK_1434c3c3a968600574513a07604" PRIMARY KEY ("id")
      )`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "post" ADD CONSTRAINT "FK_c6fb082a3114f35d0cc27c515e0" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_version" ADD CONSTRAINT "FK_8e43590559a2283a5e3f52b75b9" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_e3aebe2bd1c53467a07109be57d" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_94a85bb16d24033a2afdd5df060" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_73aac24175373a6a1b84b5f9374" FOREIGN KEY ("parentCommentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" ADD CONSTRAINT "FK_54b5dc2739f207f495d0e2e057f" FOREIGN KEY ("followerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" ADD CONSTRAINT "FK_54b9f52558509a25b2965a7e6e5" FOREIGN KEY ("followingId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD CONSTRAINT "FK_16a4f80333d74d929b138a261a8" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_a7457a485542805d76d495b5976" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" ADD CONSTRAINT "FK_21e869c02c65f2425827387d8a6" FOREIGN KEY ("roomId") REFERENCES "chat_room"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_21e869c02c65f2425827387d8a6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_message" DROP CONSTRAINT "FK_a7457a485542805d76d495b5976"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media" DROP CONSTRAINT "FK_16a4f80333d74d929b138a261a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" DROP CONSTRAINT "FK_54b9f52558509a25b2965a7e6e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "follow" DROP CONSTRAINT "FK_54b5dc2739f207f495d0e2e057f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_73aac24175373a6a1b84b5f9374"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_94a85bb16d24033a2afdd5df060"`,
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_e3aebe2bd1c53467a07109be57d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_version" DROP CONSTRAINT "FK_8e43590559a2283a5e3f52b75b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post" DROP CONSTRAINT "FK_c6fb082a3114f35d0cc27c515e0"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "chat_message"`);
    await queryRunner.query(`DROP TABLE "chat_room"`);
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`DROP TABLE "follow"`);
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TABLE "post_version"`);
    await queryRunner.query(`DROP TABLE "post"`);
    await queryRunner.query(`DROP TABLE "user"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE "public"."upload_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."media_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."post_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
  }
}
