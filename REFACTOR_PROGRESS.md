# Refactor Progress: Consumption → MealConsumption

## ✅ COMPLETED

### 1. Schema Changes
- ✅ Renamed `MealPortion` to `MealConsumption`
- ✅ Added fields from `Consumption` to `MealConsumption`: `name`, `description`, `type`, `groupId`, `isActive`, `totalKcal`, `recordedAt`
- ✅ Removed `Consumption` and `ConsumptionMeal` models
- ✅ Updated `FoodPortion` to reference `mealConsumptionId` instead of `mealPortionId`
- ✅ Updated all model relations (Profile, Group, Meal, VotingSession, GameSession)
- ✅ Added `group` value to `ConsumptionSource` enum

### 2. Backend Controllers - Updated

#### ✅ mealConsumptionsLib.js (NEW)
- Created completely new library to replace consumptionsLib
- `getMealConsumptions()` - Get all meal consumptions with filters
- `getMealConsumptionById()` - Get specific meal consumption
- `createIndividualMealConsumption()` - Create individual consumption
- `createGroupMealConsumption()` - Create group consumption
- `updateMealConsumption()` - Update consumption
- `deleteMealConsumption()` - Soft delete consumption
- `getMealConsumptionStats()` - Get statistics
- `getGroupFilteredMeals()` - Get filtered meals for group
- `getGroupMostConsumedMeals()` - Get most consumed meals

#### ✅ votingLib.js
- Updated `createGroupConsumptionFromVote()` to redirect to new implementation

#### ✅ votingHistoryLib.js
- Updated `selectMealPortion()` to use `MealConsumption` and `foodPortions`
- Updated `defaultExpiredParticipants()` to create `MealConsumption` with food portions
- Updated `getParticipantStatus()` to fetch `mealConsumption`
- Updated `getVotingSessionDetails()` to include `mealConsumptions` instead of `mealPortions`
- ✅ Added `createMealConsumptionFromVotingSession()` - New function to create consumption from voting

#### ✅ profilesLib.js
- Updated `getCalorieProgress()` to use `MealConsumption` instead of `Consumption`

## ⚠️ PENDING - Backend

### 3. Controllers Still Need Update

#### gameHistoryLib.js
Lines that need updating:
- Line 160: `prisma.mealPortion.findMany` → `prisma.mealConsumption.findMany`
- Line 325: `prisma.mealPortion.findFirst` → `prisma.mealConsumption.findFirst`
- Line 340: `prisma.mealPortion.update` → `prisma.mealConsumption.update`
- Line 371: `prisma.mealPortion.create` → `prisma.mealConsumption.create`
- Lines 416-440: Remove old `prisma.consumption` references

#### gamesLib.js
- Line 22: `prisma.consumption.create` → `prisma.mealConsumption.create`
- Line 43: `prisma.consumption.create` → `prisma.mealConsumption.create`
- Function `recordGroupConsumptionForGame()` needs complete rewrite

### 4. Routes Need Update

#### routes/consumptions.js
- **MUST BE DELETED** - Replace with new routes file
- All endpoints use old `consumptionsLib`

#### NEW: routes/mealConsumptions.js (TO CREATE)
New endpoints to create:
- `GET /meal-consumptions` - Get all meal consumptions
- `GET /meal-consumptions/user/:profileId` - Get user meal consumptions
- `GET /meal-consumptions/:id` - Get specific consumption
- `POST /meal-consumptions/individual` - Create individual consumption
- `POST /meal-consumptions/group` - Create group consumption
- `PUT /meal-consumptions/:id` - Update consumption
- `DELETE /meal-consumptions/:id` - Delete consumption
- `GET /meal-consumptions/stats` - Get statistics
- `GET /meal-consumptions/groups/:groupId/filtered-meals` - Get filtered meals
- `GET /meal-consumptions/groups/:groupId/most-consumed` - Get most consumed

#### routes/index.js
- Update to use new `/meal-consumptions` instead of `/consumptions`

### 5. Delete Old Files
- **DELETE** `controllers/consumptionsLib.js`
- **DELETE** `routes/consumptions.js`

## ⚠️ PENDING - Frontend

### API Calls to Update
All frontend files using `/consumptions` endpoints:
- `components/voting/VotingService.ts` - Update `createConsumptionFromVote()`
- `lib/utils/groupService.ts` - Update `/consumptions/groups/...` calls
- `lib/services/MealService.ts` - Update consumption endpoints
- `lib/hooks/useKcalProgress.tsx` - Update consumption fetching
- `components/dashboard/MealPreferencesPieChart.tsx` - Update consumption queries

## Database Changes Required

### Migration Status
✅ Schema migrated - `MealConsumption` table created
✅ Old `Consumption` and `ConsumptionMeal` tables removed

## Next Steps

1. **Update remaining backend controllers:**
   - gameHistoryLib.js
   - gamesLib.js

2. **Create new routes file:**
   - Create `routes/mealConsumptions.js`
   - Update `routes/index.js`

3. **Delete old files:**
   - Delete `controllers/consumptionsLib.js`
   - Delete `routes/consumptions.js`

4. **Test backend:**
   - Run all tests
   - Fix any errors

5. **Update frontend:**
   - Update all API calls to use new endpoints
   - Test all consumption-related features

6. **Final verification:**
   - Verify voting system works
   - Verify game system works
   - Verify individual/group consumptions work
   - Verify calorie tracking works
