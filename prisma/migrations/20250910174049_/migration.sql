/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "userID" SERIAL NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("userID");

-- CreateTable
CREATE TABLE "public"."Preference" (
    "PreferenceID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("PreferenceID")
);

-- CreateTable
CREATE TABLE "public"."Food" (
    "FoodID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "svgLink" TEXT NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("FoodID")
);

-- CreateTable
CREATE TABLE "public"."DietaryRestriction" (
    "DietaryRestrictionID" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "DietaryRestriction_pkey" PRIMARY KEY ("DietaryRestrictionID")
);

-- CreateTable
CREATE TABLE "public"."_PreferenceToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PreferenceToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_FoodToPreference" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FoodToPreference_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_DietaryRestrictionToFood" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DietaryRestrictionToFood_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_DietaryRestrictionToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DietaryRestrictionToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preference_name_key" ON "public"."Preference"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DietaryRestriction_name_key" ON "public"."DietaryRestriction"("name");

-- CreateIndex
CREATE INDEX "_PreferenceToUser_B_index" ON "public"."_PreferenceToUser"("B");

-- CreateIndex
CREATE INDEX "_FoodToPreference_B_index" ON "public"."_FoodToPreference"("B");

-- CreateIndex
CREATE INDEX "_DietaryRestrictionToFood_B_index" ON "public"."_DietaryRestrictionToFood"("B");

-- CreateIndex
CREATE INDEX "_DietaryRestrictionToUser_B_index" ON "public"."_DietaryRestrictionToUser"("B");

-- AddForeignKey
ALTER TABLE "public"."_PreferenceToUser" ADD CONSTRAINT "_PreferenceToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Preference"("PreferenceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_PreferenceToUser" ADD CONSTRAINT "_PreferenceToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FoodToPreference" ADD CONSTRAINT "_FoodToPreference_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Food"("FoodID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FoodToPreference" ADD CONSTRAINT "_FoodToPreference_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Preference"("PreferenceID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToFood" ADD CONSTRAINT "_DietaryRestrictionToFood_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."DietaryRestriction"("DietaryRestrictionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToFood" ADD CONSTRAINT "_DietaryRestrictionToFood_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Food"("FoodID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToUser" ADD CONSTRAINT "_DietaryRestrictionToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."DietaryRestriction"("DietaryRestrictionID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DietaryRestrictionToUser" ADD CONSTRAINT "_DietaryRestrictionToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;
