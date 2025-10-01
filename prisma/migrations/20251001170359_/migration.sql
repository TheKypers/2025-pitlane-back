-- CreateTable
CREATE TABLE "public"."mealfood" (
    "MealFoodID" SERIAL NOT NULL,
    "mealId" INTEGER NOT NULL,
    "foodId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "mealfood_pkey" PRIMARY KEY ("MealFoodID")
);

-- AlterTable
ALTER TABLE "public"."food" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "profileId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "mealfood_mealId_foodId_key" ON "public"."mealfood"("mealId", "foodId");

-- AddForeignKey
ALTER TABLE "public"."food" ADD CONSTRAINT "food_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mealfood" ADD CONSTRAINT "mealfood_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "public"."meal"("MealID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."mealfood" ADD CONSTRAINT "mealfood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "public"."food"("FoodID") ON DELETE CASCADE ON UPDATE CASCADE;