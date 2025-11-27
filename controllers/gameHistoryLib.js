const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Format game type for user-friendly display
 * e.g., 'egg_clicker' -> 'Egg Clicker'
 */
function formatGameType(gameType) {
  return gameType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get game history for a group
 * Returns all completed game sessions with winner details
 */
async function getGroupGameHistory(groupId, limit = 10, offset = 0) {
  const sessions = await prisma.gameSession.findMany({
    where: {
      groupId: parseInt(groupId),
      status: 'completed',
      winnerId: { not: null }
    },
    include: {
      winningMeal: {
        include: {
          mealFoods: {
            include: {
              food: true
            }
          }
        }
      },
      winner: {
        select: {
          id: true,
          username: true
        }
      },
      host: {
        select: {
          id: true,
          username: true
        }
      },
      participants: {
        include: {
          profile: {
            select: {
              id: true,
              username: true
            }
          },
          meal: true
        }
      },
      _count: {
        select: {
          participants: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: offset,
    take: limit
  });

  // Format the response
  const formattedSessions = sessions.map(session => ({
    sessionId: session.GameSessionID,
    gameType: session.gameType,
    duration: session.duration,
    createdAt: session.createdAt,
    startTime: session.startTime,
    endTime: session.endTime,
    status: session.status,
    winner: {
      id: session.winner?.id,
      username: session.winner?.username,
      clickCount: session.participants?.find(p => p.profileId === session.winnerId)?.clickCount || 0
    },
    winningMeal: session.winningMeal ? {
      mealId: session.winningMeal.MealID,
      name: session.winningMeal.name,
      description: session.winningMeal.description
    } : null,
    participantCount: session._count.participants
  }));

  return {
    sessions: formattedSessions,
    total: formattedSessions.length,
    limit,
    offset
  };
}

/**
 * Get a specific game session with full details including portions
 */
async function getGameSessionDetails(sessionId) {
  const session = await prisma.gameSession.findUnique({
    where: { GameSessionID: parseInt(sessionId) },
    include: {
      winningMeal: {
        include: {
          mealFoods: {
            include: {
              food: true
            }
          }
        }
      },
      winner: {
        select: {
          id: true,
          username: true
        }
      },
      host: {
        select: {
          id: true,
          username: true
        }
      },
      participants: {
        include: {
          profile: {
            select: {
              id: true,
              username: true
            }
          },
          meal: {
            include: {
              mealFoods: {
                include: {
                  food: true
                }
              }
            }
          }
        },
        orderBy: {
          joinedAt: 'asc'
        }
      }
    }
  });

  if (!session) {
    return null;
  }

  // Fetch meal portions for game session
  const mealPortions = await prisma.mealPortion.findMany({
    where: {
      gameSessionId: parseInt(sessionId),
      source: 'game'
    },
    include: {
      profile: {
        select: {
          id: true,
          username: true
        }
      },
      meal: true,
      foodPortions: {
        include: {
          food: true
        }
      }
    }
  });

  // Group portions by profile ID
  const portionsByProfile = {};
  mealPortions.forEach(portion => {
    if (!portionsByProfile[portion.profileId]) {
      portionsByProfile[portion.profileId] = [];
    }
    portionsByProfile[portion.profileId].push(portion);
  });

  // Format participant data
  const participants = session.participants.map(participant => {
    const participantPortions = portionsByProfile[participant.profileId] || [];
    const hasSelectedPortion = participantPortions.length > 0;
    const portionFraction = hasSelectedPortion ? participantPortions[0].portionFraction : undefined;
    
    return {
      participantId: participant.GameParticipantID,
      profile: {
        id: participant.profile.id,
        username: participant.profile.username
      },
      proposedMeal: participant.meal ? {
        mealId: participant.meal.MealID,
        name: participant.meal.name,
        description: participant.meal.description,
        foods: participant.meal.mealFoods.map(mf => ({
          foodId: mf.food.FoodID,
          name: mf.food.name,
          quantity: mf.quantity,
          kCal: mf.food.kCal
        }))
      } : null,
      clickCount: participant.clickCount,
      isReady: participant.isReady,
      hasSubmitted: participant.hasSubmitted,
      joinedAt: participant.joinedAt,
      submittedAt: participant.submittedAt,
      hasSelectedPortion,
      portionFraction,
      // Meal portions consumed
      mealPortions: participantPortions.map(mp => ({
        mealId: mp.mealId,
        mealName: mp.meal.name,
        mealPortionId: mp.MealPortionID,
        consumedAt: mp.consumedAt,
        foodPortions: mp.foodPortions.map(fp => ({
          foodId: fp.foodId,
          name: fp.food.name,
          portionFraction: fp.portionFraction,
          quantityConsumed: fp.quantityConsumed
        }))
      }))
    };
  });

  // Format the response
  return {
    sessionId: session.GameSessionID,
    gameType: session.gameType,
    duration: session.duration,
    status: session.status,
    createdAt: session.createdAt,
    startTime: session.startTime,
    endTime: session.endTime,
    host: {
      id: session.host.id,
      username: session.host.username
    },
    winner: session.winner ? {
      id: session.winner.id,
      username: session.winner.username,
      clickCount: participants.find(p => p.profile.id === session.winnerId)?.clickCount || 0
    } : null,
    winningMeal: session.winningMeal ? {
      mealId: session.winningMeal.MealID,
      name: session.winningMeal.name,
      description: session.winningMeal.description,
      foods: session.winningMeal.mealFoods.map(mf => ({
        foodId: mf.food.FoodID,
        name: mf.food.name,
        quantity: mf.quantity,
        kCal: mf.food.kCal
      }))
    } : null,
    participants
  };
}

/**
 * Register meal portion for a game participant
 * Allows participants to record what portions of the winning meal they consumed
 */
async function registerGameMealPortion(sessionId, profileId, mealId, portionData) {
  console.log('[Game History Lib] registerGameMealPortion called with:', {
    sessionId,
    profileId,
    mealId,
    portionData
  });
  
  const { mealPortionFraction, foodPortions } = portionData;
  
  console.log('[Game History Lib] Destructured values:', {
    mealPortionFraction,
    foodPortionsCount: foodPortions?.length
  });

  // Verify participant was in the game
  const participant = await prisma.gameParticipant.findFirst({
    where: {
      gameSessionId: parseInt(sessionId),
      profileId: profileId
    }
  });

  if (!participant) {
    throw new Error('You were not a participant in this game session');
  }

  // Verify the game is completed
  const session = await prisma.gameSession.findUnique({
    where: { GameSessionID: parseInt(sessionId) },
    include: {
      winningMeal: {
        include: {
          mealFoods: {
            include: {
              food: true
            }
          }
        }
      }
    }
  });

  if (!session || session.status !== 'completed') {
    throw new Error('Can only register portions for completed games');
  }

  if (!session.winningMeal) {
    throw new Error('Game session does not have a winning meal');
  }

  // Check if portion already exists for this user and game session
  const existingPortion = await prisma.mealPortion.findFirst({
    where: {
      profileId: profileId,
      gameSessionId: parseInt(sessionId),
      source: 'game'
    }
  });

  let mealPortion;
  if (existingPortion) {
    // Update existing portion
    await prisma.foodPortion.deleteMany({
      where: { mealPortionId: existingPortion.MealPortionID }
    });

    mealPortion = await prisma.mealPortion.update({
      where: { MealPortionID: existingPortion.MealPortionID },
      data: {
        portionFraction: parseFloat(mealPortionFraction),
        consumedAt: new Date(),
        foodPortions: {
          create: foodPortions.map(fp => {
            // Find the original meal food to calculate quantity consumed
            const originalFood = session.winningMeal?.mealFoods.find(mf => mf.foodId === fp.foodId);
            const quantityConsumed = originalFood 
              ? originalFood.quantity * fp.portionFraction 
              : 0;

            return {
              foodId: fp.foodId,
              portionFraction: fp.portionFraction,
              quantityConsumed: quantityConsumed
            };
          })
        }
      },
      include: {
        foodPortions: {
          include: {
            food: true
          }
        }
      }
    });
  } else {
    // Create new portion
    mealPortion = await prisma.mealPortion.create({
      data: {
        profileId: profileId,
        mealId: parseInt(mealId),
        source: 'game',
        gameSessionId: parseInt(sessionId),
        portionFraction: parseFloat(mealPortionFraction),
        consumedAt: new Date(),
        foodPortions: {
          create: foodPortions.map(fp => {
            // Find the original meal food to calculate quantity consumed
            const originalFood = session.winningMeal?.mealFoods.find(mf => mf.foodId === fp.foodId);
            const quantityConsumed = originalFood 
              ? originalFood.quantity * fp.portionFraction 
              : 0;

            return {
              foodId: fp.foodId,
              portionFraction: fp.portionFraction,
              quantityConsumed: quantityConsumed
            };
          })
        }
      },
      include: {
        foodPortions: {
          include: {
            food: true
          }
        }
      }
    });
  }

  // Create or update individual consumption for the user based on selected portions
  try {
    // Calculate total calories from selected portions
    const totalCalories = session.winningMeal.mealFoods.reduce((sum, mealFood) => {
      const foodPortion = foodPortions.find(fp => fp.foodId === mealFood.foodId);
      const portionFraction = foodPortion ? parseFloat(foodPortion.portionFraction) : mealPortionFraction;
      const quantityConsumed = mealFood.quantity * portionFraction;
      return sum + (mealFood.food.kCal * quantityConsumed / mealFood.quantity);
    }, 0);

    // Check if consumption already exists for this meal portion
    const existingConsumption = await prisma.consumption.findFirst({
      where: {
        profileId: profileId,
        consumptionMeals: {
          some: {
            mealPortionId: mealPortion.MealPortionID
          }
        }
      }
    });

    if (existingConsumption) {
      // Update existing consumption
      await prisma.consumption.update({
        where: { ConsumptionID: existingConsumption.ConsumptionID },
        data: {
          name: `${session.winningMeal.name} (${Math.round(parseFloat(mealPortionFraction) * 100)}%)`,
          description: `From ${formatGameType(session.gameType)} game - ${Math.round(parseFloat(mealPortionFraction) * 100)}% portion`,
          totalKcal: Math.round(totalCalories)
        }
      });
      console.log('[Game History] Updated consumption:', existingConsumption.ConsumptionID);
    } else {
      // Create new consumption record with ConsumptionMeal linked to MealPortion
      const consumption = await prisma.consumption.create({
        data: {
          profileId: profileId,
          name: `${session.winningMeal.name} (${Math.round(parseFloat(mealPortionFraction) * 100)}%)`,
          description: `From ${formatGameType(session.gameType)} game - ${Math.round(parseFloat(mealPortionFraction) * 100)}% portion`,
          type: 'individual',
          totalKcal: Math.round(totalCalories),
          consumptionMeals: {
            create: {
              mealId: session.winningMealId,
              mealPortionId: mealPortion.MealPortionID,
              quantity: 1
            }
          }
        }
      });

      console.log('[Game History] Created consumption:', consumption.ConsumptionID, 'with', totalCalories, 'kCal, linked to MealPortion:', mealPortion.MealPortionID);
    }
  } catch (consumptionError) {
    console.error('[Game History] Error creating/updating consumption:', consumptionError);
    // Don't fail the whole operation if consumption creation fails
    // The portion selection is still saved
  }

  return mealPortion;
}

module.exports = {
  getGroupGameHistory,
  getGameSessionDetails,
  registerGameMealPortion
};
