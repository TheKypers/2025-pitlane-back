// controllers/consumptionsLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get all consumptions with filters
 */
async function getConsumptions(filters = {}) {
    const { profileId, groupId, type, startDate, endDate, individualOnly } = filters;
    
    let whereClause = {
        isActive: true
    };

    if (profileId) {
        whereClause.profileId = profileId;
    }

    if (groupId) {
        whereClause.groupId = parseInt(groupId);
    }

    // If individualOnly flag is set, only get consumptions where groupId is null
    if (individualOnly) {
        whereClause.groupId = null;
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

    // Verify that the user is a member of the group and get all group members
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
                        select: {
                            id: true,
                            username: true
                        }
                    }
                }
            }
        }
    });

    if (!groupInfo) {
        throw new Error('Group not found');
    }

    // Verify that the user is a member of the group
    const userIsMember = groupInfo.members.some(member => member.profile.id === profileId);
    if (!userIsMember) {
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

    // Use a transaction to create the group consumption and individual consumptions
    const result = await prisma.$transaction(async (tx) => {
        // Create the main group consumption record
        const groupConsumption = await tx.consumption.create({
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

        // Create individual consumption records for each group member
        const individualConsumptions = await Promise.all(
            groupInfo.members.map(async (member) => {
                return tx.consumption.create({
                    data: {
                        name: `${name} (Group: ${groupInfo.name})`,
                        description: `Individual consumption from group meal: ${description || name}`,
                        type: 'individual',
                        profileId: member.profile.id,
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
                        profile: {
                            select: {
                                id: true,
                                username: true,
                                role: true
                            }
                        }
                    }
                });
            })
        );

        return {
            groupConsumption,
            individualConsumptions,
            memberCount: groupInfo.members.length
        };
    });

    return result.groupConsumption;
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

/**
 * Get most consumed meals by a group (top 3)
 */
async function getGroupMostConsumedMeals(groupId, limit = 3) {
    // First verify the group exists and user has access
    const groupInfo = await prisma.group.findUnique({
        where: {
            GroupID: parseInt(groupId),
            isActive: true
        },
        include: {
            members: {
                where: { isActive: true },
                select: { profileId: true }
            }
        }
    });

    if (!groupInfo) {
        throw new Error('Group not found');
    }

    // Get member profile IDs
    const memberProfileIds = groupInfo.members.map(member => member.profileId);

    // Get consumptions from group members with meal information
    const consumptions = await prisma.consumption.findMany({
        where: {
            profileId: { in: memberProfileIds },
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
                                        select: {
                                            FoodID: true,
                                            name: true,
                                            kCal: true
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
                    username: true
                }
            }
        },
        orderBy: {
            consumedAt: 'desc'
        }
    });

    // Count meal occurrences and calculate stats
    const mealStats = {};
    
    consumptions.forEach(consumption => {
        consumption.consumptionMeals.forEach(consumptionMeal => {
            const meal = consumptionMeal.meal;
            const mealKey = `${meal.name}_${meal.MealID}`;
            
            if (!mealStats[mealKey]) {
                mealStats[mealKey] = {
                    mealId: meal.MealID,
                    name: meal.name,
                    description: meal.description,
                    count: 0,
                    totalKcal: 0,
                    foods: meal.mealFoods.map(mf => ({
                        name: mf.food.name,
                        kcal: mf.food.kCal,
                        quantity: mf.quantity
                    })),
                    consumedBy: new Set()
                };
            }
            
            mealStats[mealKey].count += consumptionMeal.quantity || 1;
            // Calculate kcal based on meal foods
            const mealKcal = meal.mealFoods.reduce((total, mf) => {
                return total + (mf.food.kCal * (mf.quantity || 1));
            }, 0);
            mealStats[mealKey].totalKcal += mealKcal * (consumptionMeal.quantity || 1);
            mealStats[mealKey].consumedBy.add(consumption.profile.username);
        });
    });

    // Convert to array, calculate averages, and sort by consumption count
    const sortedMeals = Object.values(mealStats)
        .map(meal => ({
            ...meal,
            averageKcal: meal.count > 0 ? Math.round(meal.totalKcal / meal.count) : 0,
            consumedBy: Array.from(meal.consumedBy),
            uniqueConsumers: meal.consumedBy.size
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

    return {
        groupId: parseInt(groupId),
        groupName: groupInfo.name,
        memberCount: groupInfo.members.length,
        mostConsumedMeals: sortedMeals,
        totalConsumptions: consumptions.length
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
    getGroupFilteredMeals,
    getGroupMostConsumedMeals
};