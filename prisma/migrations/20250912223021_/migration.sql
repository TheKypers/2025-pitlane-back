/*
  Warnings:

  - You are about to drop the `DietaryRestriction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Food` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Preference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DietaryRestrictionToFood` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DietaryRestrictionToProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FoodToPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PreferenceToProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToFood" DROP CONSTRAINT "_DietaryRestrictionToFood_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToFood" DROP CONSTRAINT "_DietaryRestrictionToFood_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToProfile" DROP CONSTRAINT "_DietaryRestrictionToProfile_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_DietaryRestrictionToProfile" DROP CONSTRAINT "_DietaryRestrictionToProfile_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_FoodToPreference" DROP CONSTRAINT "_FoodToPreference_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_FoodToPreference" DROP CONSTRAINT "_FoodToPreference_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PreferenceToProfile" DROP CONSTRAINT "_PreferenceToProfile_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_PreferenceToProfile" DROP CONSTRAINT "_PreferenceToProfile_B_fkey";

-- DropTable
DROP TABLE "public"."DietaryRestriction";

-- DropTable
DROP TABLE "public"."Food";

-- DropTable
DROP TABLE "public"."Preference";

-- DropTable
DROP TABLE "public"."Profile";

-- DropTable
DROP TABLE "public"."_DietaryRestrictionToFood";

-- DropTable
DROP TABLE "public"."_DietaryRestrictionToProfile";

-- DropTable
DROP TABLE "public"."_FoodToPreference";

-- DropTable
DROP TABLE "public"."_PreferenceToProfile";

-- CreateTable
CREATE TABLE "public"."profile" (
    "id" UUID NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'user',
    "username" TEXT NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."preference" (
    "PreferenceID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "preference_pkey" PRIMARY KEY ("PreferenceID")
);

-- CreateTable
CREATE TABLE "public"."food" (
    "FoodID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "svgLink" TEXT NOT NULL,

    CONSTRAINT "food_pkey" PRIMARY KEY ("FoodID")
);

-- CreateTable
CREATE TABLE "public"."dietaryrestriction" (
    "DietaryRestrictionID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "dietaryrestriction_pkey" PRIMARY KEY ("DietaryRestrictionID")
);

-- CreateTable
CREATE TABLE "public"."_profile_preference" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_profile_preference_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_preference_food" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_preference_food_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_food_dietaryrestriction" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_food_dietaryrestriction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_profile_dietaryrestriction" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_profile_dietaryrestriction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "profile_username_key" ON "public"."profile"("username");

-- CreateIndex
CREATE UNIQUE INDEX "preference_name_key" ON "public"."preference"("name");

-- CreateIndex
CREATE UNIQUE INDEX "food_name_key" ON "public"."food"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dietaryrestriction_name_key" ON "public"."dietaryrestriction"("name");

-- CreateIndex
CREATE INDEX "_profile_preference_B_index" ON "public"."_profile_preference"("B");

-- CreateIndex
CREATE INDEX "_preference_food_B_index" ON "public"."_preference_food"("B");

-- CreateIndex
CREATE INDEX "_food_dietaryrestriction_B_index" ON "public"."_food_dietaryrestriction"("B");

-- CreateIndex
CREATE INDEX "_profile_dietaryrestriction_B_index" ON "public"."_profile_dietaryrestriction"("B");

-- AddForeignKey
ALTER TABLE "public"."_profile_preference" ADD CONSTRAINT "_profile_preference_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."preference"("PreferenceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_profile_preference" ADD CONSTRAINT "_profile_preference_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_preference_food" ADD CONSTRAINT "_preference_food_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."food"("FoodID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_preference_food" ADD CONSTRAINT "_preference_food_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."preference"("PreferenceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_food_dietaryrestriction" ADD CONSTRAINT "_food_dietaryrestriction_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."dietaryrestriction"("DietaryRestrictionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_food_dietaryrestriction" ADD CONSTRAINT "_food_dietaryrestriction_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."food"("FoodID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_profile_dietaryrestriction" ADD CONSTRAINT "_profile_dietaryrestriction_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."dietaryrestriction"("DietaryRestrictionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_profile_dietaryrestriction" ADD CONSTRAINT "_profile_dietaryrestriction_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
