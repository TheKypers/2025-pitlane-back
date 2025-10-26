const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get voting history for a group
 * Returns all completed voting sessions with winner details
 */
async function getGroupVotingHistory(groupId, limit = 10, offset = 0) {
  const sessions = await prisma.votingSession.findMany({
    where: {
      groupId: parseInt(groupId),
      status: 'completed',
      winnerMealId: { not: null }
    },
    include: {
      winnerMeal: {
        include: {
          mealFoods: {
            include: {
              food: true
            }
          }
        }
      },
      initiator: {
        select: {
          id: true,
          username: true
        }
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          },
          mealPortions: {
            include: {
              foodPortions: {
                include: {
                  food: true
                }
              }
            }
          }
        }
      },
      proposals: true,
      _count: {
        select: {
          participants: true
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    },
    skip: offset,
    take: limit
  });

  // Format the response
  const formattedSessions = sessions.map(session => ({
    sessionId: session.VotingSessionID,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    status: session.status,
    winnerMeal: {
      mealId: session.winnerMeal?.MealID,
      name: session.winnerMeal?.name,
      voteCount: session.proposals?.find(p => p.mealId === session.winnerMealId)?.voteCount || 0
    },
    totalVotes: session.proposals?.reduce((sum, p) => sum + (p.voteCount || 0), 0) || 0,
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
 * Get a specific voting session with full details including portions
 */
async function getVotingSessionDetails(sessionId) {
  const session = await prisma.votingSession.findUnique({
    where: { VotingSessionID: parseInt(sessionId) },
    include: {
      winnerMeal: {
        include: {
          mealFoods: {
            include: {
              food: true
            }
          }
        }
      },
      proposals: {
        include: {
          meal: true,
          proposedBy: {
            select: {
              id: true,
              username: true
            }
          }
        }
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          },
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

  // Format the response
  return {
    sessionId: session.VotingSessionID,
    createdAt: session.createdAt,
    completedAt: session.completedAt,
    status: session.status,
    winnerMeal: session.winnerMeal ? {
      mealId: session.winnerMeal.MealID,
      name: session.winnerMeal.name,
      description: session.winnerMeal.description,
      mealFoods: session.winnerMeal.mealFoods.map(mf => ({
        foodId: mf.food.FoodID,
        foodName: mf.food.name,
        quantity: mf.quantity,
        svgLink: mf.food.svgLink,
        kCal: mf.food.kCal
      })),
      totalCalories: session.winnerMeal.mealFoods.reduce((sum, mf) => 
        sum + (mf.food.kCal * mf.quantity), 0
      )
    } : null,
    proposals: session.proposals.map(proposal => ({
      proposalId: proposal.MealProposalID,
      mealId: proposal.mealId,
      mealName: proposal.meal.name,
      proposedBy: proposal.proposedBy?.username || null,
      voteCount: proposal.voteCount || 0
    })),
    participants: session.participants.map(participant => {
      // Calculate portion deadline: 15 minutes after session completion
      const portionDeadline = session.completedAt 
        ? new Date(session.completedAt.getTime() + 15 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Far future if not completed

      return {
        userId: participant.userId,
        userName: participant.user.username,
        hasSelectedPortion: participant.hasSelectedPortion,
        defaultedToWhole: participant.defaultedToWhole,
        portionFraction: participant.mealPortions[0]?.portionFraction,
        portionDeadline: portionDeadline.toISOString(),
        joinedAt: participant.joinedAt
      };
    })
  };
}

/**
 * Add or update participant when they join a voting session
 * Called when user votes or confirms readiness
 */
async function trackParticipant(sessionId, userId) {
  const session = await prisma.votingSession.findUnique({
    where: { VotingSessionID: parseInt(sessionId) }
  });

  if (!session) {
    throw new Error('Voting session not found');
  }

  // Calculate deadline: 15 minutes after completion
  // If not completed yet, set a far future date (will be updated on completion)
  const deadline = session.completedAt 
    ? new Date(session.completedAt.getTime() + 15 * 60 * 1000)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now as placeholder

  const participant = await prisma.votingSessionParticipant.upsert({
    where: {
      votingSessionId_userId: {
        votingSessionId: parseInt(sessionId),
        userId: userId
      }
    },
    update: {
      // Update deadline if session just completed
      ...(session.completedAt && {
        portionDeadline: deadline
      })
    },
    create: {
      votingSessionId: parseInt(sessionId),
      userId: userId,
      portionDeadline: deadline
    },
    include: {
      user: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  return participant;
}

/**
 * Update all participants' deadlines when voting session completes
 */
async function updateParticipantDeadlines(sessionId) {
  const session = await prisma.votingSession.findUnique({
    where: { VotingSessionID: parseInt(sessionId) }
  });

  if (!session || !session.completedAt) {
    throw new Error('Session not completed');
  }

  const deadline = new Date(session.completedAt.getTime() + 15 * 60 * 1000);

  await prisma.votingSessionParticipant.updateMany({
    where: {
      votingSessionId: parseInt(sessionId)
    },
    data: {
      portionDeadline: deadline
    }
  });

  return { deadline };
}

/**
 * Select portion for a participant
 * Allows user to specify what fraction of the meal and each ingredient they consumed
 */
async function selectMealPortion(sessionId, userId, portionData) {
  const { mealPortionFraction, foodPortions } = portionData;

  // Get participant
  const participant = await prisma.votingSessionParticipant.findUnique({
    where: {
      votingSessionId_userId: {
        votingSessionId: parseInt(sessionId),
        userId: userId
      }
    }
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Check if deadline has passed
  if (new Date() > participant.portionDeadline) {
    throw new Error('Portion selection deadline has passed');
  }

  // Get session with winner meal
  const session = await prisma.votingSession.findUnique({
    where: { VotingSessionID: parseInt(sessionId) },
    include: {
      winnerMeal: {
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

  if (!session || !session.winnerMealId) {
    throw new Error('No winner meal found');
  }

  // Find existing meal portion for this participant and meal
  const existingMealPortion = await prisma.mealPortion.findFirst({
    where: {
      participantId: participant.ParticipantID,
      mealId: session.winnerMealId
    }
  });

  let mealPortion;
  if (existingMealPortion) {
    // Update existing meal portion
    mealPortion = await prisma.mealPortion.update({
      where: { MealPortionID: existingMealPortion.MealPortionID },
      data: {
        portionFraction: parseFloat(mealPortionFraction)
      }
    });
  } else {
    // Create new meal portion
    mealPortion = await prisma.mealPortion.create({
      data: {
        participantId: participant.ParticipantID,
        mealId: session.winnerMealId,
        portionFraction: parseFloat(mealPortionFraction)
      }
    });
  }

  // Delete existing food portions
  await prisma.foodPortion.deleteMany({
    where: {
      mealPortionId: mealPortion.MealPortionID
    }
  });

  // Create food portions
  const foodPortionPromises = foodPortions.map(fp => {
    const originalFood = session.winnerMeal.mealFoods.find(mf => mf.foodId === fp.foodId);
    const quantityConsumed = originalFood ? originalFood.quantity * parseFloat(fp.portionFraction) : 0;

    return prisma.foodPortion.create({
      data: {
        mealPortionId: mealPortion.MealPortionID,
        foodId: fp.foodId,
        portionFraction: parseFloat(fp.portionFraction),
        quantityConsumed: quantityConsumed
      }
    });
  });

  await Promise.all(foodPortionPromises);

  // Mark participant as having selected portion
  await prisma.votingSessionParticipant.update({
    where: { ParticipantID: participant.ParticipantID },
    data: {
      hasSelectedPortion: true,
      selectedAt: new Date()
    }
  });

  // Create individual consumption for the user based on selected portions
  try {
    // Calculate total calories from selected portions
    const totalCalories = session.winnerMeal.mealFoods.reduce((sum, mealFood) => {
      const foodPortion = foodPortions.find(fp => fp.foodId === mealFood.foodId);
      const portionFraction = foodPortion ? parseFloat(foodPortion.portionFraction) : mealPortionFraction;
      const quantityConsumed = mealFood.quantity * portionFraction;
      return sum + (mealFood.food.kCal * quantityConsumed / mealFood.quantity);
    }, 0);

    // Create consumption record with ConsumptionMeal linked to MealPortion
    const consumption = await prisma.consumption.create({
      data: {
        profileId: userId,
        name: `${session.winnerMeal.name} (${Math.round(parseFloat(mealPortionFraction) * 100)}%)`,
        description: `From voting session - ${Math.round(parseFloat(mealPortionFraction) * 100)}% portion`,
        type: 'individual',
        totalKcal: Math.round(totalCalories),
        consumptionMeals: {
          create: {
            mealId: session.winnerMealId,
            mealPortionId: mealPortion.MealPortionID,
            quantity: 1
          }
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
            mealPortion: {
              include: {
                foodPortions: {
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

    console.log('[Voting History] Created consumption:', consumption.ConsumptionID, 'with', totalCalories, 'kCal, linked to MealPortion:', mealPortion.MealPortionID);
  } catch (consumptionError) {
    console.error('[Voting History] Error creating consumption:', consumptionError);
    // Don't fail the whole operation if consumption creation fails
    // The portion selection is still saved
  }

  // Get updated participant with portions
  const updatedParticipant = await prisma.votingSessionParticipant.findUnique({
    where: { ParticipantID: participant.ParticipantID },
    include: {
      mealPortions: {
        include: {
          foodPortions: {
            include: {
              food: true
            }
          }
        }
      }
    }
  });

  return updatedParticipant;
}

/**
 * Default participants to whole meal if deadline passed
 * Called by a cron job or when viewing history
 */
async function defaultExpiredParticipants(sessionId) {
  const now = new Date();
  
  const expiredParticipants = await prisma.votingSessionParticipant.findMany({
    where: {
      votingSessionId: parseInt(sessionId),
      hasSelectedPortion: false,
      portionDeadline: { lt: now },
      defaultedToWhole: false
    },
    include: {
      votingSession: {
        include: {
          winnerMeal: {
            include: {
              mealFoods: true
            }
          }
        }
      }
    }
  });

  const results = [];

  for (const participant of expiredParticipants) {
    if (!participant.votingSession.winnerMealId) continue;

    // Create whole meal portion
    const mealPortion = await prisma.mealPortion.create({
      data: {
        participantId: participant.ParticipantID,
        mealId: participant.votingSession.winnerMealId,
        portionFraction: 1.0 // whole meal
      }
    });

    // Create food portions for each ingredient (whole portion)
    const foodPortions = await Promise.all(
      participant.votingSession.winnerMeal.mealFoods.map(mf =>
        prisma.foodPortion.create({
          data: {
            mealPortionId: mealPortion.MealPortionID,
            foodId: mf.foodId,
            portionFraction: 1.0,
            quantityConsumed: mf.quantity
          }
        })
      )
    );

    // Mark as defaulted
    await prisma.votingSessionParticipant.update({
      where: { ParticipantID: participant.ParticipantID },
      data: {
        defaultedToWhole: true,
        hasSelectedPortion: true,
        selectedAt: now
      }
    });

    results.push({
      participantId: participant.ParticipantID,
      userId: participant.userId,
      defaulted: true
    });
  }

  return results;
}

/**
 * Get participant portion selection status
 */
async function getParticipantStatus(sessionId, userId) {
  const participant = await prisma.votingSessionParticipant.findUnique({
    where: {
      votingSessionId_userId: {
        votingSessionId: parseInt(sessionId),
        userId: userId
      }
    },
    include: {
      mealPortions: {
        include: {
          foodPortions: {
            include: {
              food: true
            }
          }
        }
      }
    }
  });

  if (!participant) {
    return null;
  }

  const now = new Date();
  const deadlinePassed = now > participant.portionDeadline;
  const timeRemaining = participant.portionDeadline - now;

  return {
    ...participant,
    deadlinePassed,
    timeRemaining: deadlinePassed ? 0 : timeRemaining
  };
}

module.exports = {
  getGroupVotingHistory,
  getVotingSessionDetails,
  trackParticipant,
  updateParticipantDeadlines,
  selectMealPortion,
  defaultExpiredParticipants,
  getParticipantStatus
};
