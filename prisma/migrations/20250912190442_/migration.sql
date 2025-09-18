/*
  Warnings:

  - You are about to drop the column `avatar_url` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `Profile` table. All the data in the column will be lost.
  - Made the column `username` on table `Profile` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'user');

-- AlterTable
ALTER TABLE "public"."Profile" DROP COLUMN "avatar_url",
DROP COLUMN "created_at",
ADD COLUMN     "role" "public"."Role" NOT NULL DEFAULT 'user',
ALTER COLUMN "username" SET NOT NULL;
