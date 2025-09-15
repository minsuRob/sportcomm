-- Add gender column to users table
-- Migration: 005_add_user_gender

-- Add gender enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE "GenderCode" AS ENUM('M', 'F', 'O');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add gender column to users table
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "gender" "GenderCode";

-- Add comment to the gender column
COMMENT ON COLUMN "users"."gender" IS '사용자 성별 (M: 남성, F: 여성, O: 기타)';
