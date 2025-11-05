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

    // Obtener TODAS las consumptions del usuario con sus comidas incluidas
    const consumptions = await prisma.consumption.findMany({
      where: {
        profileId: userId,
        type: 'individual', // Solo consumptions individuales para el progreso personal
        isActive: true
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
        // Calcular kcal totales de la meal sumando las kcal de todas sus foods
        const mealTotalKcal = consumptionMeal.meal?.mealFoods?.reduce((mealTotal, mealFood) => {
          const foodKcal = mealFood.food?.kCal || 0;
          const foodQuantity = mealFood.quantity || 1;
          const foodTotalKcal = foodKcal * foodQuantity;
          
          return mealTotal + foodTotalKcal;
        }, 0) || 0;
        
        // Multiplicar por la cantidad de porciones de la meal consumidas
        const consumptionQuantity = consumptionMeal.quantity || 1;
        const actualKcal = mealTotalKcal * consumptionQuantity;
        
        return consumptionTotal + actualKcal;
      }, 0);
      
      return total + consumptionKcal;
    }, 0);

    const goal = profile?.calorie_goal || 2000;

    return {
      consumed, // Total de calorías consumidas hasta ahora
      goal      // Objetivo diario de calorías
    };
  } catch (error) {
    console.error('Error in getCalorieProgress:', error);
    throw error;
  }
};

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
  updateCalorieGoal,
  getCalorieProgress,
};
