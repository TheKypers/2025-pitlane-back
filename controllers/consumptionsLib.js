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
            consumptionFoods: {
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
            consumptionFoods: {
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
    const { name, description, foods, consumedAt } = consumptionData;
    
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
        throw new Error('Foods array is required and cannot be empty');
    }

    // Calculate total kcal
    let totalKcal = 0;
    const foodPromises = foods.map(async (food) => {
        const foodData = await prisma.food.findUnique({
            where: { FoodID: food.foodId }
        });
        if (!foodData) {
            throw new Error(`Food with ID ${food.foodId} not found`);
        }
        return {
            ...food,
            kcal: foodData.kCal
        };
    });

    const foodsWithKcal = await Promise.all(foodPromises);
    totalKcal = foodsWithKcal.reduce((total, food) => 
        total + (food.kcal * food.quantity), 0
    );

    return prisma.consumption.create({
        data: {
            name,
            description,
            type: 'individual',
            profileId,
            totalKcal,
            consumedAt: consumedAt ? new Date(consumedAt) : new Date(),
            consumptionFoods: {
                create: foods.map(food => ({
                    foodId: food.foodId,
                    quantity: food.quantity || 1
                }))
            }
        },
        include: {
            consumptionFoods: {
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
    const { name, description, foods, groupId, consumedAt } = consumptionData;
    
    if (!foods || !Array.isArray(foods) || foods.length === 0) {
        throw new Error('Foods array is required and cannot be empty');
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

    // Calculate total kcal
    let totalKcal = 0;
    const foodPromises = foods.map(async (food) => {
        const foodData = await prisma.food.findUnique({
            where: { FoodID: food.foodId }
        });
        if (!foodData) {
            throw new Error(`Food with ID ${food.foodId} not found`);
        }
        return {
            ...food,
            kcal: foodData.kCal
        };
    });

    const foodsWithKcal = await Promise.all(foodPromises);
    totalKcal = foodsWithKcal.reduce((total, food) => 
        total + (food.kcal * food.quantity), 0
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
            consumptionFoods: {
                create: foods.map(food => ({
                    foodId: food.foodId,
                    quantity: food.quantity || 1
                }))
            }
        },
        include: {
            consumptionFoods: {
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
    const { name, description, foods, consumedAt } = consumptionData;
    
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
    
    // If foods are provided, update them and recalculate kcal
    if (foods && Array.isArray(foods)) {
        // Delete existing consumption foods
        await prisma.consumptionFood.deleteMany({
            where: {
                consumptionId: parseInt(consumptionId)
            }
        });

        // Calculate new total kcal
        const foodPromises = foods.map(async (food) => {
            const foodData = await prisma.food.findUnique({
                where: { FoodID: food.foodId }
            });
            if (!foodData) {
                throw new Error(`Food with ID ${food.foodId} not found`);
            }
            return {
                ...food,
                kcal: foodData.kCal
            };
        });

        const foodsWithKcal = await Promise.all(foodPromises);
        totalKcal = foodsWithKcal.reduce((total, food) => 
            total + (food.kcal * food.quantity), 0
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
            ...(foods && Array.isArray(foods) && {
                consumptionFoods: {
                    create: foods.map(food => ({
                        foodId: food.foodId,
                        quantity: food.quantity || 1
                    }))
                }
            })
        },
        include: {
            consumptionFoods: {
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
 * Get filtered foods based on group dietary preferences and restrictions
 */
async function getGroupFilteredFoods(groupId) {
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

    // Get foods that don't violate any group member's dietary restrictions
    const restrictionIds = uniqueDietaryRestrictions.map(r => r.DietaryRestrictionID);
    
    let foodsWhereClause = {
        isActive: true
    };

    if (restrictionIds.length > 0) {
        foodsWhereClause.dietaryRestrictions = {
            none: {
                DietaryRestrictionID: {
                    in: restrictionIds
                }
            }
        };
    }

    const filteredFoods = await prisma.food.findMany({
        where: foodsWhereClause,
        include: {
            dietaryRestrictions: true,
            preferences: true,
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

    return {
        groupId: groupInfo.GroupID,
        groupName: groupInfo.name,
        memberCount: groupInfo.members.length,
        appliedRestrictions: uniqueDietaryRestrictions,
        availableFoods: filteredFoods
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
    getGroupFilteredFoods
};