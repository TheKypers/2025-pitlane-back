// controllers/mealsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllMealsWithProfiles() {
    return prisma.meal.findMany({
        include: {
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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

async function createMeal(name, description, profileId, mealData) {
    console.log('createMeal called with:', { name, profileId, mealData });
    
    // Check if mealData is in the new format (array of objects with foodId and quantity) 
    // or old format (array of foodIds)
    const isNewFormat = Array.isArray(mealData) && mealData.length > 0 && 
                       typeof mealData[0] === 'object' && mealData[0].hasOwnProperty('foodId');
    
    let foodIds;
    let mealFoodsData;
    
    if (isNewFormat) {
        // New format: array of objects with foodId and quantity
        foodIds = mealData.map(item => parseInt(item.foodId));
        mealFoodsData = mealData.map(item => ({
            foodId: parseInt(item.foodId),
            quantity: parseInt(item.quantity) || 1 // Use the actual quantity from the frontend
        }));
        
        console.log('Using new format (mealFoods) with quantities:', mealFoodsData);
        
        // Validate quantities are positive
        for (const item of mealData) {
            const quantity = parseInt(item.quantity);
            if (quantity !== undefined && (isNaN(quantity) || quantity <= 0)) {
                throw new Error('Quantity must be a positive number');
            }
        }
    } else {
        // Old format: array of foodIds (for backward compatibility)
        foodIds = mealData.map(id => parseInt(id));
        mealFoodsData = foodIds.map(id => ({
            foodId: parseInt(id),
            quantity: 1 // default quantity
        }));
        
        console.log('Using old format (foodIds) with default quantities:', mealFoodsData);
    }

    // Validate that all food IDs exist
    const existingFoods = await prisma.food.findMany({
        where: {
            FoodID: {
                in: foodIds
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

    console.log('Creating meal with mealFoods data:', mealFoodsData);

    return prisma.meal.create({
        data: {
            name,
            description,
            profileId,
            mealFoods: {
                create: mealFoodsData
            }
        },
        include: {
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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

async function updateMeal(id, name, description, mealData) {
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

    // Handle meal foods data
    if (mealData && Array.isArray(mealData)) {
        if (mealData.length === 0) {
            throw new Error('A meal must have at least one food');
        }

        // Check if it's the new format (with quantities) or old format (just foodIds)
        const isNewFormat = mealData.some(item => typeof item === 'object' && item.hasOwnProperty('foodId'));
        
        if (isNewFormat) {
            // New format: array of objects with foodId and quantity
            const foodIds = mealData.map(item => parseInt(item.foodId));
            
            // Validate that all food IDs exist
            const existingFoods = await prisma.food.findMany({
                where: {
                    FoodID: {
                        in: foodIds
                    }
                }
            });

            if (existingFoods.length !== foodIds.length) {
                throw new Error('One or more food IDs are invalid');
            }

            updateData.mealFoods = {
                deleteMany: {}, // Delete all existing MealFood records for this meal
                create: mealData.map(item => ({
                    foodId: parseInt(item.foodId),
                    quantity: parseInt(item.quantity) || 1
                }))
            };
        } else {
            // Old format: array of foodIds
            const foodIds = mealData.map(id => parseInt(id));
            
            // Validate that all food IDs exist
            const existingFoods = await prisma.food.findMany({
                where: {
                    FoodID: {
                        in: foodIds
                    }
                }
            });

            if (existingFoods.length !== foodIds.length) {
                throw new Error('One or more food IDs are invalid');
            }

            updateData.mealFoods = {
                deleteMany: {}, // Delete all existing MealFood records for this meal
                create: foodIds.map(id => ({
                    foodId: parseInt(id),
                    quantity: 1 // default quantity
                }))
            };
        }
    }

    return prisma.meal.update({
        where: { MealID: id },
        data: updateData,
        include: {
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true,
                            profile: true
                        }
                    }
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