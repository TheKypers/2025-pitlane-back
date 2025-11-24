// controllers/profilesLib.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // Declaración única de prisma

async function getAllProfiles() {
    return prisma.profile.findMany({
        include: { Preference: true, DietaryRestriction: true }
    });
}

async function getProfileById(id, userEmail = null) {
    return prisma.profile.findUnique({
        where: { id: id },
        include: { Preference: true, DietaryRestriction: true }
    });
}

async function createProfile({ id, username, preferences = [], dietaryRestrictions = [] }) {
    return prisma.profile.create({
        data: {
            id,
            username,
            Preference: preferences.length ? { connect: preferences.map(PreferenceID => ({ PreferenceID })) } : undefined,
            DietaryRestriction: dietaryRestrictions.length ? { connect: dietaryRestrictions.map(DietaryRestrictionID => ({ DietaryRestrictionID })) } : undefined
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Delete a profile by id
async function deleteProfile(id) {
    try {
        await prisma.profile.delete({ where: { id: id } });
        return true;
    } catch (err) {
        if (err.code === 'P2025') return false;
        throw err;
    }
}

module.exports = {
    getAllProfiles,
    getProfileById,
    createProfile,
    deleteProfile
};

// PATCH: Update username by profile id
async function updateProfileUsername(id, newUsername) {
    return prisma.profile.update({
        where: { id },
        data: { username: newUsername },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// PATCH: Update role by profile id
async function updateProfileRole(id, newRole) {
    return prisma.profile.update({
        where: { id },
        data: { role: newRole },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Add preferences to a profile
async function addPreferencesToProfile(profileId, preferenceIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            Preference: {
                connect: preferenceIds.map(PreferenceID => ({ PreferenceID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Remove preferences from a profile
async function removePreferencesFromProfile(profileId, preferenceIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            Preference: {
                disconnect: preferenceIds.map(PreferenceID => ({ PreferenceID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Add dietary restrictions to a profile
async function addDietaryRestrictionsToProfile(profileId, restrictionIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            DietaryRestriction: {
                connect: restrictionIds.map(DietaryRestrictionID => ({ DietaryRestrictionID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Remove dietary restrictions from a profile
async function removeDietaryRestrictionsFromProfile(profileId, restrictionIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            DietaryRestriction: {
                disconnect: restrictionIds.map(DietaryRestrictionID => ({ DietaryRestrictionID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Set all preferences for a profile (replace existing)
async function setProfilePreferences(profileId, preferenceIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            Preference: {
                set: preferenceIds.map(PreferenceID => ({ PreferenceID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}

// Set all dietary restrictions for a profile (replace existing)
async function setProfileDietaryRestrictions(profileId, restrictionIds) {
    return prisma.profile.update({
        where: { id: profileId },
        data: {
            DietaryRestriction: {
                set: restrictionIds.map(DietaryRestrictionID => ({ DietaryRestrictionID }))
            }
        },
        include: { Preference: true, DietaryRestriction: true }
    });
}


// calorieGoal.js
// Actualizar el objetivo de calorías
const updateCalorieGoal = async (userId, calorieGoal) => {
  return await prisma.profile.update({
    where: { id: userId },
    data: { calorie_goal: calorieGoal },
  });
};

// Obtener el progreso de calorías
const getCalorieProgress = async (userId, date = new Date()) => {
  try {
    // Obtener perfil del usuario
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
    });

    // Crear fechas de inicio y fin del día para filtrar consumptions del día específico
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Obtener solo las consumptions del día específico
    const consumptions = await prisma.consumption.findMany({
      where: {
        profileId: userId,
        // Only include individual consumptions (exclude group consumptions)
        type: 'individual',
        isActive: true,
        consumedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        consumptionMeals: {
          include: {
            meal: {
              include: {
                mealFoods: {
                  include: {
                    food: true
                  }
                }
              }
            },
            // Include mealPortion and its foodPortions so we can compute partial consumptions
            mealPortion: {
              include: {
                foodPortions: {
                  include: { food: true }
                }
              }
            }
          }
        }
      }
    });



    // Sumar todas las calorías de las comidas individuales dentro de cada consumption
    const consumed = consumptions.reduce((total, consumption) => {
      // Si no hay consumptionMeals, usar totalKcal como fallback
      if (!consumption.consumptionMeals || consumption.consumptionMeals.length === 0) {
        const fallbackKcal = consumption.totalKcal || 0;
        return total + fallbackKcal;
      }
      
      // Sumar kcal de cada comida en esta consumption
      const consumptionKcal = consumption.consumptionMeals.reduce((consumptionTotal, consumptionMeal) => {
        // Base meal kcal (whole meal) computed from Meal -> MealFoods
        const baseMealKcal = consumptionMeal.meal?.mealFoods?.reduce((mealTotal, mealFood) => {
          const foodKcal = mealFood.food?.kCal || 0;
          const foodQuantity = mealFood.quantity || 1;
          return mealTotal + (foodKcal * foodQuantity);
        }, 0) || 0;

        let mealTotalKcal = baseMealKcal;

        // If a MealPortion with detailed FoodPortions exists, use those quantities (more precise)
        if (consumptionMeal.mealPortion && consumptionMeal.mealPortion.foodPortions && consumptionMeal.mealPortion.foodPortions.length > 0) {
          mealTotalKcal = consumptionMeal.mealPortion.foodPortions.reduce((mpTotal, fp) => {
            const fpFoodKcal = fp.food?.kCal || 0;
            const fpQuantityConsumed = fp.quantityConsumed || 0;
            return mpTotal + (fpFoodKcal * fpQuantityConsumed);
          }, 0);
        } else if (consumptionMeal.mealPortion && typeof consumptionMeal.mealPortion.portionFraction === 'number') {
          // If there's a portion fraction (e.g., 0.5 for half), scale the base meal kcal
          mealTotalKcal = baseMealKcal * consumptionMeal.mealPortion.portionFraction;
        }

        // Multiply by the number of servings recorded in ConsumptionMeal.quantity
        const consumptionQuantity = consumptionMeal.quantity || 1;
        const actualKcal = mealTotalKcal * consumptionQuantity;

        return consumptionTotal + actualKcal;
      }, 0);
      
      return total + consumptionKcal;
    }, 0);

    const goal = profile?.calorie_goal || 2000;

    return {
      consumed, // Total de calorías consumidas en el día específico
      goal,     // Objetivo diario de calorías
      date: targetDate.toISOString().split('T')[0] // Fecha del progreso en formato YYYY-MM-DD
    };
  } catch (error) {
    console.error('Error in getCalorieProgress:', error);
    throw error;
  }
};

// Actualizar el badge principal del usuario
async function updatePrimaryBadge(userId, badgeId) {
  try {
    const updatedProfile = await prisma.profile.update({
      where: { id: userId },
      data: { primaryBadgeId: badgeId || null },
      include: {
        primaryBadge: true
      }
    });

    // If user has a primary badge, get their leve  l for that badge
    let badgeData = updatedProfile.primaryBadge;
    if (badgeData) {
      const userBadge = await prisma.userBadge.findFirst({
        where: {
          profileId: userId,
          badgeId: badgeData.BadgeID
        }
      });
      
      if (userBadge) {
        badgeData = {
          ...badgeData,
          currentLevel: userBadge.currentLevel
        };
      }
    }

    return {
      success: true,
      data: {
        profileId: updatedProfile.id,
        primaryBadge: badgeData
      }
    };
  } catch (error) {
    console.error('Error updating primary badge:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Obtener el badge principal del usuario
async function getPrimaryBadge(userId) {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      include: {
        primaryBadge: true
      }
    });

    if (!profile) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // If user has a primary badge, get their level for that badge
    let badgeData = profile.primaryBadge;
    if (badgeData) {
      const userBadge = await prisma.userBadge.findFirst({
        where: {
          profileId: userId,
          badgeId: badgeData.BadgeID
        }
      });
      
      if (userBadge) {
        badgeData = {
          ...badgeData,
          currentLevel: userBadge.currentLevel
        };
      }
    }

    return {
      success: true,
      data: {
        profileId: profile.id,
        primaryBadge: badgeData
      }
    };
  } catch (error) {
    console.error('Error fetching primary badge:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Set both preferences and dietary restrictions for a profile
async function setProfilePreferencesAndRestrictions(id, preferences = [], dietaryRestrictions = []) {
  return prisma.profile.update({
    where: { id },
    data: {
      Preference: {
        set: preferences.map(PreferenceID => ({ PreferenceID }))
      },
      DietaryRestriction: {
        set: dietaryRestrictions.map(DietaryRestrictionID => ({ DietaryRestrictionID }))
      }
    },
    include: { Preference: true, DietaryRestriction: true }
  });
}

module.exports = {
  getAllProfiles,
  getProfileById,
  createProfile,
  deleteProfile,
  updateProfileUsername,
  updateProfileRole,
  addPreferencesToProfile,
  removePreferencesFromProfile,
  addDietaryRestrictionsToProfile,
  removeDietaryRestrictionsFromProfile,
  setProfilePreferences,
  setProfileDietaryRestrictions,
  setProfilePreferencesAndRestrictions,
  updateCalorieGoal,
  getCalorieProgress,
  updatePrimaryBadge,
  getPrimaryBadge,
};
