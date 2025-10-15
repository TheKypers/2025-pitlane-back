// controllers/consumptionsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all consumptions with filters
 */
async function getConsumptions(filters = {}) {
    const { profileId, groupId, type, startDate, endDate } = filters;
    
    let whereClause = {
        isActive: true
    };

    if (profileId) {
        whereClause.profileId = profileId;
    }

    if (groupId) {
        whereClause.groupId = parseInt(groupId);
    }

    if (type) {
        whereClause.type = type;
    }

    if (startDate || endDate) {
        whereClause.consumedAt = {};
        if (startDate) {
            whereClause.consumedAt.gte = new Date(startDate);
        }
        if (endDate) {
            whereClause.consumedAt.lte = new Date(endDate);
        }
    }

    return prisma.consumption.findMany({
        where: whereClause,
        include: {
            consumptionMeals: {
                include: {
                    meal: {
                        include: {
                            mealFoods: {
                                include: {
                                    food: {
                                        include: {
                                            dietaryRestrictions: true,
                                            preferences: true
                                        }
                                    }
                                }
                            },
                            profile: {
                                select: {
                                    id: true,
                                    username: true
                                }
                            }
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
            },
            group: {
                select: {
                    GroupID: true,
                    name: true,
                    description: true
                }
            }
        },
        orderBy: {
            consumedAt: 'desc'
        }
    });
}

/**
 * Get a specific consumption by ID
 */
async function getConsumptionById(consumptionId) {
    return prisma.consumption.findUnique({
        where: {
            ConsumptionID: parseInt(consumptionId),
            isActive: true
        },
        include: {
            consumptionMeals: {
                include: {
                    meal: {
                        include: {
                            mealFoods: {
                                include: {
                                    food: {
                                        include: {
                                            dietaryRestrictions: true,
                                            preferences: true,
                                            profile: {
                                                select: {
                                                    id: true,
                                                    username: true
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            profile: {
                                select: {
                                    id: true,
                                    username: true
                                }
                            }
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
            },
            group: {
                include: {
                    members: {
                        where: {
                            isActive: true
                        },
                        include: {
                            profile: {
                                select: {
                                    id: true,
                                    username: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create individual consumption record
 */
async function createIndividualConsumption(consumptionData, profileId) {
    const { name, description, meals, consumedAt } = consumptionData;
    
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
        throw new Error('Meals array is required and cannot be empty');
    }

    // Calculate total kcal by getting meals and their foods
    let totalKcal = 0;
    const mealPromises = meals.map(async (meal) => {
        const mealData = await prisma.meal.findUnique({
            where: { MealID: meal.mealId },
            include: {
                mealFoods: {
                    include: {
                        food: true
                    }
                }
            }
        });
        if (!mealData) {
            throw new Error(`Meal with ID ${meal.mealId} not found`);
        }
        
        // Calculate kcal for this meal
        const mealKcal = mealData.mealFoods.reduce((sum, mealFood) => 
            sum + (mealFood.food.kCal * mealFood.quantity), 0
        );
        
        return {
            ...meal,
            kcal: mealKcal
        };
    });

    const mealsWithKcal = await Promise.all(mealPromises);
    totalKcal = mealsWithKcal.reduce((total, meal) => 
        total + (meal.kcal * meal.quantity), 0
    );

    return prisma.consumption.create({
        data: {
            name,
            description,
            type: 'individual',
            profileId,
            totalKcal,
            consumedAt: consumedAt ? new Date(consumedAt) : new Date(),
            consumptionMeals: {
                create: meals.map(meal => ({
                    mealId: meal.mealId,
                    quantity: meal.quantity || 1
                }))
            }
        },
        include: {
            consumptionMeals: {
                include: {
                    meal: {
                        include: {
                            mealFoods: {
                                include: {
                                    food: {
                                        include: {
                                            dietaryRestrictions: true,
                                            preferences: true
                                        }
                                    }
                                }
                            }
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

/**
 * Create group consumption record
 */
async function createGroupConsumption(consumptionData, profileId) {
    const { name, description, meals, groupId, consumedAt } = consumptionData;
    
    if (!meals || !Array.isArray(meals) || meals.length === 0) {
        throw new Error('Meals array is required and cannot be empty');
    }

    if (!groupId) {
        throw new Error('Group ID is required for group consumption');
    }

    // Verify that the user is a member of the group
    const groupMember = await prisma.groupMember.findUnique({
        where: {
            groupId_profileId: {
                groupId: parseInt(groupId),
                profileId: profileId
            }
        }
    });

    if (!groupMember || !groupMember.isActive) {
        throw new Error('User is not a member of this group');
    }

    // Calculate total kcal by getting meals and their foods
    let totalKcal = 0;
    const mealPromises = meals.map(async (meal) => {
        const mealData = await prisma.meal.findUnique({
            where: { MealID: meal.mealId },
            include: {
                mealFoods: {
                    include: {
                        food: true
                    }
                }
            }
        });
        if (!mealData) {
            throw new Error(`Meal with ID ${meal.mealId} not found`);
        }
        
        // Calculate kcal for this meal
        const mealKcal = mealData.mealFoods.reduce((sum, mealFood) => 
            sum + (mealFood.food.kCal * mealFood.quantity), 0
        );
        
        return {
            ...meal,
            kcal: mealKcal
        };
    });

    const mealsWithKcal = await Promise.all(mealPromises);
    totalKcal = mealsWithKcal.reduce((total, meal) => 
        total + (meal.kcal * meal.quantity), 0
    );

    return prisma.consumption.create({
        data: {
            name,
            description,
            type: 'group',
            profileId,
            groupId: parseInt(groupId),
            totalKcal,
            consumedAt: consumedAt ? new Date(consumedAt) : new Date(),
            consumptionMeals: {
                create: meals.map(meal => ({
                    mealId: meal.mealId,
                    quantity: meal.quantity || 1
                }))
            }
        },
        include: {
            consumptionMeals: {
                include: {
                    meal: {
                        include: {
                            mealFoods: {
                                include: {
                                    food: {
                                        include: {
                                            dietaryRestrictions: true,
                                            preferences: true
                                        }
                                    }
                                }
                            }
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
            },
            group: {
                select: {
                    GroupID: true,
                    name: true,
                    description: true
                }
            }
        }
    });
}

/**
 * Update consumption record
 */
async function updateConsumption(consumptionId, consumptionData, profileId) {
    const { name, description, meals, consumedAt } = consumptionData;
    
    // Check if consumption exists and belongs to the user
    const existingConsumption = await prisma.consumption.findUnique({
        where: {
            ConsumptionID: parseInt(consumptionId)
        }
    });

    if (!existingConsumption) {
        throw new Error('Consumption not found');
    }

    if (existingConsumption.profileId !== profileId) {
        throw new Error('Unauthorized to update this consumption');
    }

    let totalKcal = existingConsumption.totalKcal;
    
    // If meals are provided, update them and recalculate kcal
    if (meals && Array.isArray(meals)) {
        // Delete existing consumption meals
        await prisma.consumptionMeal.deleteMany({
            where: {
                consumptionId: parseInt(consumptionId)
            }
        });

        // Calculate new total kcal
        const mealPromises = meals.map(async (meal) => {
            const mealData = await prisma.meal.findUnique({
                where: { MealID: meal.mealId },
                include: {
                    mealFoods: {
                        include: {
                            food: true
                        }
                    }
                }
            });
            if (!mealData) {
                throw new Error(`Meal with ID ${meal.mealId} not found`);
            }
            
            // Calculate kcal for this meal
            const mealKcal = mealData.mealFoods.reduce((sum, mealFood) => 
                sum + (mealFood.food.kCal * mealFood.quantity), 0
            );
            
            return {
                ...meal,
                kcal: mealKcal
            };
        });

        const mealsWithKcal = await Promise.all(mealPromises);
        totalKcal = mealsWithKcal.reduce((total, meal) => 
            total + (meal.kcal * meal.quantity), 0
        );
    }

    return prisma.consumption.update({
        where: {
            ConsumptionID: parseInt(consumptionId)
        },
        data: {
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(consumedAt && { consumedAt: new Date(consumedAt) }),
            totalKcal,
            ...(meals && Array.isArray(meals) && {
                consumptionMeals: {
                    create: meals.map(meal => ({
                        mealId: meal.mealId,
                        quantity: meal.quantity || 1
                    }))
                }
            })
        },
        include: {
            consumptionMeals: {
                include: {
                    meal: {
                        include: {
                            mealFoods: {
                                include: {
                                    food: {
                                        include: {
                                            dietaryRestrictions: true,
                                            preferences: true
                                        }
                                    }
                                }
                            }
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
            },
            group: {
                select: {
                    GroupID: true,
                    name: true,
                    description: true
                }
            }
        }
    });
}

/**
 * Delete consumption record (soft delete)
 */
async function deleteConsumption(consumptionId, profileId) {
    const existingConsumption = await prisma.consumption.findUnique({
        where: {
            ConsumptionID: parseInt(consumptionId)
        }
    });

    if (!existingConsumption) {
        throw new Error('Consumption not found');
    }

    if (existingConsumption.profileId !== profileId) {
        throw new Error('Unauthorized to delete this consumption');
    }

    return prisma.consumption.update({
        where: {
            ConsumptionID: parseInt(consumptionId)
        },
        data: {
            isActive: false
        }
    });
}

/**
 * Get consumption statistics for a user or group
 */
async function getConsumptionStats(filters = {}) {
    const { profileId, groupId, startDate, endDate } = filters;
    
    let whereClause = {
        isActive: true
    };

    if (profileId) {
        whereClause.profileId = profileId;
    }

    if (groupId) {
        whereClause.groupId = parseInt(groupId);
    }

    if (startDate || endDate) {
        whereClause.consumedAt = {};
        if (startDate) {
            whereClause.consumedAt.gte = new Date(startDate);
        }
        if (endDate) {
            whereClause.consumedAt.lte = new Date(endDate);
        }
    }

    const stats = await prisma.consumption.aggregate({
        where: whereClause,
        _count: {
            ConsumptionID: true
        },
        _sum: {
            totalKcal: true
        },
        _avg: {
            totalKcal: true
        }
    });

    return {
        totalConsumptions: stats._count.ConsumptionID || 0,
        totalKcal: stats._sum.totalKcal || 0,
        averageKcal: Math.round(stats._avg.totalKcal || 0)
    };
}

/**
 * Get filtered meals based on group dietary preferences and restrictions
 */
async function getGroupFilteredMeals(groupId) {
    const groupInfo = await prisma.group.findUnique({
        where: {
            GroupID: parseInt(groupId),
            isActive: true
        },
        include: {
            members: {
                where: {
                    isActive: true
                },
                include: {
                    profile: {
                        include: {
                            Preference: true,
                            DietaryRestriction: true
                        }
                    }
                }
            }
        }
    });

    if (!groupInfo) {
        throw new Error('Group not found');
    }

    // Collect all dietary restrictions from group members
    const allDietaryRestrictions = [];
    groupInfo.members.forEach(member => {
        allDietaryRestrictions.push(...member.profile.DietaryRestriction);
    });

    // Remove duplicates
    const uniqueDietaryRestrictions = allDietaryRestrictions.filter((restriction, index, self) =>
        index === self.findIndex(r => r.DietaryRestrictionID === restriction.DietaryRestrictionID)
    );

    // Get meals that don't violate any group member's dietary restrictions
    const restrictionIds = uniqueDietaryRestrictions.map(r => r.DietaryRestrictionID);
    
    // Get all meals and filter them based on their foods' dietary restrictions
    const allMeals = await prisma.meal.findMany({
        include: {
            mealFoods: {
                include: {
                    food: {
                        include: {
                            dietaryRestrictions: true,
                            preferences: true
                        }
                    }
                }
            },
            profile: {
                select: {
                    id: true,
                    username: true
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    // Filter meals based on dietary restrictions
    const filteredMeals = allMeals.filter(meal => {
        // Check if any food in the meal has a restriction that conflicts with group members
        return !meal.mealFoods.some(mealFood => 
            mealFood.food.dietaryRestrictions.some(restriction => 
                restrictionIds.includes(restriction.DietaryRestrictionID)
            )
        );
    });

    return {
        groupId: groupInfo.GroupID,
        groupName: groupInfo.name,
        memberCount: groupInfo.members.length,
        appliedRestrictions: uniqueDietaryRestrictions,
        availableMeals: filteredMeals
    };
}

module.exports = {
    getConsumptions,
    getConsumptionById,
    createIndividualConsumption,
    createGroupConsumption,
    updateConsumption,
    deleteConsumption,
    getConsumptionStats,
    getGroupFilteredMeals
};