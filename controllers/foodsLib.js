// controllers/foodsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllFoods() {
    return prisma.food.findMany({
        include: { dietaryRestrictions: true, preferences: true }
    });
}

// Get foods that match user's dietary restrictions (including For Everyone foods with id=0)
async function getFoodsForUser(userDietaryRestrictions = []) {
    // If user has no restrictions, they can eat any food
    if (userDietaryRestrictions.length === 0) {
        return prisma.food.findMany({
            include: { dietaryRestrictions: true, preferences: true }
        });
    }
    
    // If user has restrictions, they can only eat:
    // 1. Foods tagged "For Everyone" (id = 0)
    // 2. Foods that match their specific dietary restrictions
    return prisma.food.findMany({
        where: {
            OR: [
                // Foods with "For Everyone" restriction (id = 0)
                {
                    dietaryRestrictions: {
                        some: { DietaryRestrictionID: 0 }
                    }
                },
                // Foods that match user's dietary restrictions
                {
                    dietaryRestrictions: {
                        some: {
                            DietaryRestrictionID: {
                                in: userDietaryRestrictions
                            }
                        }
                    }
                }
            ]
        },
        include: { dietaryRestrictions: true, preferences: true }
    });
}

async function getFoodById(id) {

    foodId = parseInt(id);

    if (isNaN(foodId)) {
        throw new Error(`Invalid FoodID: ${id}`);
    }

    return prisma.food.findUnique({
        where: { FoodID: parseInt(foodId) },
        include: { dietaryRestrictions: true, preferences: true }
    });
}

async function getFoodsByPreference(preferenceId) {
    return prisma.food.findMany({
        where: { preferences: { some: { PreferenceID: parseInt(preferenceId) } } },
        include: { dietaryRestrictions: true, preferences: true }
    });
}

async function getFoodsByRestriction(restrictionId) {
    return prisma.food.findMany({
        where: { dietaryRestrictions: { some: { DietaryRestrictionID: parseInt(restrictionId) } } },
        include: { dietaryRestrictions: true, preferences: true }
    });
}

async function getFoodsByPreferenceAndRestriction(preferenceId, restrictionId) {
    // If both params are present, return intersection, else fallback to one
    if (preferenceId && restrictionId) {
        const foodsByPref = await getFoodsByPreference(preferenceId);
        const foodsByRestr = await getFoodsByRestriction(restrictionId);
        // Intersection by FoodID
        const idsByRestr = new Set(foodsByRestr.map(f => f.FoodID));
        return foodsByPref.filter(f => idsByRestr.has(f.FoodID));
    } else if (preferenceId) {
        return getFoodsByPreference(preferenceId);
    } else if (restrictionId) {
        return getFoodsByRestriction(restrictionId);
    } else {
        return getAllFoods();
    }
}

async function getRecommendedFoodsForProfile(profileId) {
    const profile = await prisma.profile.findUnique({
        where: { id: profileId },
        include: { Preference: true, DietaryRestriction: true }
    });
    if (!profile) return null;

    const userRestrictions = profile.DietaryRestriction.map(r => r.DietaryRestrictionID);
    
    // Base query to match user preferences
    const baseQuery = {
        where: {
            AND: [
                // Match user preferences
                {
                    preferences: { 
                        some: { 
                            PreferenceID: { 
                                in: profile.Preference.map(p => p.PreferenceID) 
                            } 
                        } 
                    }
                }
            ]
        },
        include: { dietaryRestrictions: true, preferences: true }
    };
    
    // If user has no dietary restrictions, they can eat any food with their preferences
    if (userRestrictions.length === 0) {
        return prisma.food.findMany(baseQuery);
    }
    
    // If user has restrictions, add dietary restriction filtering
    baseQuery.where.AND.push({
        OR: [
            {
                dietaryRestrictions: {
                    some: { DietaryRestrictionID: 0 } // For Everyone
                }
            },
            {
                dietaryRestrictions: {
                    some: {
                        DietaryRestrictionID: {
                            in: userRestrictions
                        }
                    }
                }
            }
        ]
    });
    
    return prisma.food.findMany(baseQuery);
}

module.exports = {
    getAllFoods,
    getFoodsForUser,
    getFoodById,
    getFoodsByPreference,
    getFoodsByRestriction,
    getFoodsByPreferenceAndRestriction,
    getRecommendedFoodsForProfile,
    createFood,
    deleteFood,
    updateFood
};

// Delete a food by id
async function deleteFood(id) {
    try {
        await prisma.food.delete({ where: { FoodID: parseInt(id) } });
        return true;
    } catch (err) {
        if (err.code === 'P2025') return false;
        throw err;
    }
}

// Create a new food
async function createFood({ name, svgLink, preferences = [], dietaryRestrictions = [], hasNoRestrictions = false }) {
    // If hasNoRestrictions is true, set dietaryRestrictions to [0] (For Everyone)
    const finalRestrictions = hasNoRestrictions ? [0] : dietaryRestrictions;
    
    return prisma.food.create({
        data: {
            name,
            svgLink,
            preferences: preferences.length ? { connect: preferences.map(id => ({ PreferenceID: id })) } : undefined,
            dietaryRestrictions: finalRestrictions.length ? { connect: finalRestrictions.map(id => ({ DietaryRestrictionID: id })) } : undefined
        },
        include: { dietaryRestrictions: true, preferences: true }
    });
}

// Update a food by id
async function updateFood(id, { name, svgLink, preferences = [], dietaryRestrictions = [] }) {
    const foodId = parseInt(id);
    if (isNaN(foodId)) {
        throw new Error(`Invalid FoodID: ${id}`);
    }

    return prisma.food.update({
        where: { FoodID: foodId },
        data: {
            name,
            svgLink,
            preferences: { set: preferences.map(pid => ({ PreferenceID: pid })) },
            dietaryRestrictions: { set: dietaryRestrictions.map(rid => ({ DietaryRestrictionID: rid })) }
        },
        include: { dietaryRestrictions: true, preferences: true }
    });
}