const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
          },
          // Include meal portions consumed by participants
          mealPortions: {
            include: {
              meal: true,
              foodPortions: {
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

  // Format participant data
  const participants = session.participants.map(participant => ({
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
        unit: mf.unit,
        kcalsPer100g: mf.food.kcalsPer100g
      }))
    } : null,
    clickCount: participant.clickCount,
    isReady: participant.isReady,
    hasSubmitted: participant.hasSubmitted,
    joinedAt: participant.joinedAt,
    submittedAt: participant.submittedAt,
    // Meal portions consumed
    mealPortions: participant.mealPortions.map(mp => ({
      mealId: mp.mealId,
      mealName: mp.meal.name,
      mealPortionId: mp.MealPortionID,
      consumedAt: mp.consumedAt,
      foodPortions: mp.foodPortions.map(fp => ({
        foodId: fp.foodId,
        name: fp.food.name,
        gramsConsumed: fp.gramsConsumed,
        kcalsConsumed: fp.kcalsConsumed
      }))
    }))
  }));

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
        unit: mf.unit,
        kcalsPer100g: mf.food.kcalsPer100g
      }))
    } : null,
    participants
  };
}

/**
 * Register meal portion for a game participant
 * Allows participants to record what portions of the winning meal they consumed
 */
async function registerGameMealPortion(sessionId, profileId, mealId, foodPortions) {
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
    where: { GameSessionID: parseInt(sessionId) }
  });

  if (!session || session.status !== 'completed') {
    throw new Error('Can only register portions for completed games');
  }

  // Check if portion already exists
  const existingPortion = await prisma.mealPortion.findFirst({
    where: {
      profileId: profileId,
      mealId: parseInt(mealId),
      gameParticipantId: participant.GameParticipantID
    }
  });

  if (existingPortion) {
    // Update existing portion
    await prisma.foodPortion.deleteMany({
      where: { mealPortionId: existingPortion.MealPortionID }
    });

    const updatedPortion = await prisma.mealPortion.update({
      where: { MealPortionID: existingPortion.MealPortionID },
      data: {
        consumedAt: new Date(),
        foodPortions: {
          create: foodPortions.map(fp => ({
            foodId: fp.foodId,
            gramsConsumed: fp.gramsConsumed,
            kcalsConsumed: fp.kcalsConsumed
          }))
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

    return updatedPortion;
  } else {
    // Create new portion
    const mealPortion = await prisma.mealPortion.create({
      data: {
        profileId: profileId,
        mealId: parseInt(mealId),
        gameParticipantId: participant.GameParticipantID,
        consumedAt: new Date(),
        foodPortions: {
          create: foodPortions.map(fp => ({
            foodId: fp.foodId,
            gramsConsumed: fp.gramsConsumed,
            kcalsConsumed: fp.kcalsConsumed
          }))
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

    return mealPortion;
  }
}

module.exports = {
  getGroupGameHistory,
  getGameSessionDetails,
  registerGameMealPortion
};
