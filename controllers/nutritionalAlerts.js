// controllers/nutritionalAlerts.js
// Helper functions for dietary restriction conflicts and nutritional alerts

/**
 * Check if a food/meal conflicts with user's dietary restrictions
 * Dietary restrictions on a food indicate COMPLIANCE (e.g., "gluten-free" means no gluten)
 * A conflict occurs when user requires a restriction that the food does NOT have
 * @param {Array} itemRestrictions - Dietary restrictions the food complies with
 * @param {Array} userRestrictions - User's required dietary restrictions
 * @returns {Object} - { hasConflict: boolean, conflictingRestrictions: Array }
 */
function checkDietaryConflicts(itemRestrictions, userRestrictions) {
    if (!userRestrictions || userRestrictions.length === 0) {
        return { hasConflict: false, conflictingRestrictions: [] };
    }

    if (!itemRestrictions || itemRestrictions.length === 0) {
        // If item has no restrictions marked, we can't verify it's safe for users with restrictions
        // This means ALL user restrictions are potentially violated
        const allUserRestrictions = userRestrictions.map(r => ({
            id: typeof r === 'number' ? r : r.DietaryRestrictionID,
            name: typeof r === 'object' ? r.name : `Restriction ${r}`
        }));
        return { 
            hasConflict: true, 
            conflictingRestrictions: allUserRestrictions 
        };
    }

    // Extract restriction IDs
    const itemRestrictionIds = itemRestrictions.map(r => 
        typeof r === 'number' ? r : r.DietaryRestrictionID
    );
    const userRestrictionIds = userRestrictions.map(r => 
        typeof r === 'number' ? r : r.DietaryRestrictionID
    );

    // Check for "For Everyone" restriction (ID 0 or name contains "everyone")
    const hasForEveryone = itemRestrictions.some(r => 
        (typeof r === 'object' && (r.DietaryRestrictionID === 0 || 
        (r.name && r.name.toLowerCase().includes('everyone'))))
    );

    if (hasForEveryone) {
        return { hasConflict: false, conflictingRestrictions: [] };
    }

    // Find user restrictions that are NOT in the food's list (these are conflicts)
    // For example: User needs "vegan" but food only has "gluten-free" and "lactose-free"
    // This means the food is NOT vegan, so it's a conflict
    const conflictingRestrictions = userRestrictions.filter(userR => {
        const userId = typeof userR === 'number' ? userR : userR.DietaryRestrictionID;
        
        // If the food doesn't have this restriction, it's a conflict
        return !itemRestrictionIds.includes(userId);
    }).map(r => ({
        id: typeof r === 'number' ? r : r.DietaryRestrictionID,
        name: typeof r === 'object' ? r.name : `Restriction ${r}`
    }));

    return {
        hasConflict: conflictingRestrictions.length > 0,
        conflictingRestrictions
    };
}

/**
 * Check if a meal is fit for user's profile (respects all restrictions)
 * @param {Object} meal - Meal object with mealFoods
 * @param {Array} userRestrictions - User's dietary restrictions
 * @returns {Object} - { isFit: boolean, conflicts: Array }
 */
function checkMealFitness(meal, userRestrictions) {
    if (!meal || !meal.mealFoods || meal.mealFoods.length === 0) {
        return { isFit: true, conflicts: [] };
    }

    const allConflicts = [];
    
    for (const mealFood of meal.mealFoods) {
        const food = mealFood.food;
        if (!food) continue;

        const conflictCheck = checkDietaryConflicts(
            food.dietaryRestrictions || [],
            userRestrictions
        );

        if (conflictCheck.hasConflict) {
            allConflicts.push({
                foodId: food.FoodID,
                foodName: food.name,
                conflicts: conflictCheck.conflictingRestrictions
            });
        }
    }

    return {
        isFit: allConflicts.length === 0,
        conflicts: allConflicts
    };
}

/**
 * Calculate calorie semaphore status
 * @param {number} calories - Calories of the item/meal
 * @param {number} dailyGoal - User's daily calorie goal
 * @returns {string} - 'green', 'yellow', or 'red'
 */
function calculateCalorieSemaphore(calories, dailyGoal) {
    if (!dailyGoal || dailyGoal <= 0) {
        dailyGoal = 2000; // Default
    }

    const mealThreshold = dailyGoal / 3; // One third for green
    const yellowThreshold = (dailyGoal * 2) / 3; // Two thirds for yellow
    const redThreshold = (dailyGoal * 4) / 3; // 133% for red

    if (calories <= mealThreshold) {
        return 'green';
    } else if (calories <= yellowThreshold) {
        return 'yellow';
    } else if (calories <= redThreshold) {
        return 'yellow'; // Still manageable
    } else {
        return 'red'; // Way over limit
    }
}

/**
 * Calculate consumption stats for different time periods
 * @param {Array} consumptions - Array of consumption records
 * @param {Date} referenceDate - Reference date for calculations (default: now)
 * @returns {Object} - Stats for day, week, and month
 */
function calculateConsumptionStats(consumptions, referenceDate = new Date()) {
    const now = new Date(referenceDate);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = {
        day: { green: 0, yellow: 0, red: 0, total: 0 },
        week: { green: 0, yellow: 0, red: 0, total: 0 },
        month: { green: 0, yellow: 0, red: 0, total: 0 }
    };

    consumptions.forEach(consumption => {
        const consumptionDate = new Date(consumption.consumedAt);
        const semaphore = consumption.calorieStatus || 'green';
        
        // Day stats
        if (consumptionDate >= startOfDay) {
            stats.day[semaphore]++;
            stats.day.total++;
        }
        
        // Week stats
        if (consumptionDate >= startOfWeek) {
            stats.week[semaphore]++;
            stats.week.total++;
        }
        
        // Month stats
        if (consumptionDate >= startOfMonth) {
            stats.month[semaphore]++;
            stats.month.total++;
        }
    });

    return stats;
}

/**
 * Enrich consumption with alerts and semaphore data
 * @param {Object} consumption - Consumption record
 * @param {Array} userRestrictions - User's dietary restrictions
 * @param {number} dailyCalorieGoal - User's daily calorie goal
 * @returns {Object} - Enriched consumption with alerts
 */
function enrichConsumptionWithAlerts(consumption, userRestrictions, dailyCalorieGoal) {
    const enriched = { ...consumption };
    
    // Calculate calorie semaphore
    const totalKcal = consumption.totalKcal || 0;
    enriched.calorieStatus = calculateCalorieSemaphore(totalKcal, dailyCalorieGoal);
    
    // Check dietary conflicts if meal data is available
    if (consumption.meal) {
        const fitnessCheck = checkMealFitness(consumption.meal, userRestrictions);
        enriched.dietaryFitness = {
            isFit: fitnessCheck.isFit,
            conflicts: fitnessCheck.conflicts
        };
    }
    
    return enriched;
}

module.exports = {
    checkDietaryConflicts,
    checkMealFitness,
    calculateCalorieSemaphore,
    calculateConsumptionStats,
    enrichConsumptionWithAlerts
};
