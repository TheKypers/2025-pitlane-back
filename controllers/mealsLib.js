// controllers/mealsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllMealsWithProfiles() {
    return prisma.meal.findMany({
        include: {
            foods: {
                select: {
                    FoodID: true,
                    name: true,
                    svgLink: true
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

async function getMeals(profileId) {
    const whereClause = profileId ? { profileId: profileId } : {};
    
    return prisma.meal.findMany({
        where: whereClause,
        include: {
            foods: {
                include: {
                    dietaryRestrictions: true,
                    preferences: true
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

async function getMealById(id) {
    if (isNaN(id)) {
        throw new Error(`Invalid MealID: ${id}`);
    }

    return prisma.meal.findUnique({
        where: { MealID: id },
        include: {
            foods: {
                include: {
                    dietaryRestrictions: true,
                    preferences: true
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

async function createMeal(name, description, profileId, foodIds) {
    // Validate that all food IDs exist
    const existingFoods = await prisma.food.findMany({
        where: {
            FoodID: {
                in: foodIds.map(id => parseInt(id))
            }
        }
    });

    if (existingFoods.length !== foodIds.length) {
        throw new Error('One or more food IDs are invalid');
    }

    // Validate that profile exists
    const existingProfile = await prisma.profile.findUnique({
        where: { id: profileId }
    });

    if (!existingProfile) {
        throw new Error('Profile not found');
    }

    return prisma.meal.create({
        data: {
            name,
            description,
            profileId,
            foods: {
                connect: foodIds.map(id => ({ FoodID: parseInt(id) }))
            }
        },
        include: {
            foods: {
                include: {
                    dietaryRestrictions: true,
                    preferences: true
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

async function updateMeal(id, name, description, foodIds) {
    if (isNaN(id)) {
        throw new Error(`Invalid MealID: ${id}`);
    }

    // Check if meal exists
    const existingMeal = await prisma.meal.findUnique({
        where: { MealID: id }
    });

    if (!existingMeal) {
        return null;
    }

    const updateData = {};
    
    if (name !== undefined) {
        updateData.name = name;
    }
    
    if (description !== undefined) {
        updateData.description = description;
    }

    // If foodIds are provided, validate and update the food connections
    if (foodIds && Array.isArray(foodIds)) {
        if (foodIds.length === 0) {
            throw new Error('A meal must have at least one food');
        }

        // Validate that all food IDs exist
        const existingFoods = await prisma.food.findMany({
            where: {
                FoodID: {
                    in: foodIds.map(id => parseInt(id))
                }
            }
        });

        if (existingFoods.length !== foodIds.length) {
            throw new Error('One or more food IDs are invalid');
        }

        updateData.foods = {
            set: foodIds.map(id => ({ FoodID: parseInt(id) }))
        };
    }

    return prisma.meal.update({
        where: { MealID: id },
        data: updateData,
        include: {
            foods: {
                include: {
                    dietaryRestrictions: true,
                    preferences: true
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true,
                    role: true
                }
            }
        }
    });
}

async function deleteMeal(id) {
    if (isNaN(id)) {
        throw new Error(`Invalid MealID: ${id}`);
    }

    try {
        await prisma.meal.delete({
            where: { MealID: id }
        });
        return true;
    } catch (error) {
        if (error.code === 'P2025') {
            // Record not found
            return false;
        }
        throw error;
    }
}

async function getMealsByProfile(profileId) {
    return prisma.meal.findMany({
        where: { profileId },
        include: {
            foods: {
                include: {
                    dietaryRestrictions: true,
                    preferences: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

module.exports = {
    getAllMealsWithProfiles,
    getMeals,
    getMealById,
    createMeal,
    updateMeal,
    deleteMeal,
    getMealsByProfile
};