const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new game session
 */
async function createGameSession(groupId, hostId, gameType, duration = 30, minPlayers = 1) {
  try {
    // Verify host is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: parseInt(groupId),
        profileId: hostId
      }
    });

    if (!membership) {
      throw new Error('Host is not a member of this group');
    }

    // Check if there's already an active game session for this group
    const existingSession = await prisma.gameSession.findFirst({
      where: {
        groupId: parseInt(groupId),
        status: {
          in: ['waiting', 'ready', 'countdown', 'playing', 'submitting']
        }
      }
    });

    if (existingSession) {
      throw new Error('There is already an active game session for this group');
    }

    const gameSession = await prisma.gameSession.create({
      data: {
        groupId: parseInt(groupId),
        hostId,
        gameType,
        duration: parseInt(duration),
        minPlayers: parseInt(minPlayers),
        status: 'waiting'
      },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        group: {
          select: {
            GroupID: true,
            name: true
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
        }
      }
    });

    return gameSession;
  } catch (error) {
    console.error('[gamesLib] Error creating game session:', error);
    throw error;
  }
}

/**
 * Join a game session with a meal proposal
 */
async function joinGameSession(gameSessionId, profileId, mealId) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) },
      include: {
        group: true,
        participants: true
      }
    });

    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSession.status !== 'waiting' && gameSession.status !== 'ready') {
      throw new Error('Cannot join game - game has already started or finished');
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: gameSession.groupId,
        profileId
      }
    });

    if (!membership) {
      throw new Error('You must be a member of the group to join this game');
    }

    // Check if already participating
    const existingParticipant = gameSession.participants.find(
      p => p.profileId === profileId
    );

    if (existingParticipant) {
      // Update meal if different
      if (mealId && existingParticipant.mealId !== parseInt(mealId)) {
        const updated = await prisma.gameParticipant.update({
          where: { GameParticipantID: existingParticipant.GameParticipantID },
          data: { mealId: parseInt(mealId) },
          include: {
            profile: {
              select: {
                id: true,
                username: true
              }
            },
            meal: true
          }
        });
        return updated;
      }
      return existingParticipant;
    }

    // Verify meal belongs to the user
    if (mealId) {
      const meal = await prisma.meal.findUnique({
        where: { MealID: parseInt(mealId) }
      });

      if (!meal || meal.profileId !== profileId) {
        throw new Error('Invalid meal selection');
      }
    }

    const participant = await prisma.gameParticipant.create({
      data: {
        gameSessionId: parseInt(gameSessionId),
        profileId,
        mealId: mealId ? parseInt(mealId) : null,
        isReady: false
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true
          }
        },
        meal: true
      }
    });

    return participant;
  } catch (error) {
    console.error('[gamesLib] Error joining game session:', error);
    throw error;
  }
}

/**
 * Mark player as ready
 */
async function markPlayerReady(gameSessionId, profileId, isReady = true) {
  try {
    const participant = await prisma.gameParticipant.findFirst({
      where: {
        gameSessionId: parseInt(gameSessionId),
        profileId
      }
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const updated = await prisma.gameParticipant.update({
      where: { GameParticipantID: participant.GameParticipantID },
      data: { isReady },
      include: {
        profile: {
          select: {
            id: true,
            username: true
          }
        },
        meal: true
      }
    });

    // Check if all participants are ready
    const allParticipants = await prisma.gameParticipant.findMany({
      where: { gameSessionId: parseInt(gameSessionId) }
    });

    // Get the game session to check minPlayers
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) }
    });

    const allReady = allParticipants.length >= gameSession.minPlayers && 
                     allParticipants.every(p => p.isReady);

    if (allReady) {
      await prisma.gameSession.update({
        where: { GameSessionID: parseInt(gameSessionId) },
        data: { status: 'ready' }
      });
    }

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error marking player ready:', error);
    throw error;
  }
}

/**
 * Start game countdown (host only)
 */
async function startGameCountdown(gameSessionId, hostId) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) }
    });

    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSession.hostId !== hostId) {
      throw new Error('Only the host can start the game');
    }

    if (gameSession.status !== 'ready') {
      throw new Error('Game is not ready to start');
    }

    const updated = await prisma.gameSession.update({
      where: { GameSessionID: parseInt(gameSessionId) },
      data: { 
        status: 'countdown',
        updatedAt: new Date()
      },
      include: {
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
        }
      }
    });

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error starting countdown:', error);
    throw error;
  }
}

/**
 * Transition from countdown to playing
 */
async function startGamePlaying(gameSessionId) {
  try {
    const updated = await prisma.gameSession.update({
      where: { GameSessionID: parseInt(gameSessionId) },
      data: { 
        status: 'playing',
        startTime: new Date()
      },
      include: {
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
        }
      }
    });

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error starting game playing:', error);
    throw error;
  }
}

/**
 * End game and transition to submitting state
 */
async function endGameTime(gameSessionId) {
  try {
    const updated = await prisma.gameSession.update({
      where: { GameSessionID: parseInt(gameSessionId) },
      data: { 
        status: 'submitting',
        endTime: new Date()
      },
      include: {
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
        }
      }
    });

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error ending game time:', error);
    throw error;
  }
}

/**
 * Submit click count for a participant
 */
async function submitClickCount(gameSessionId, profileId, clickCount) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) }
    });

    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSession.status !== 'submitting' && gameSession.status !== 'playing') {
      throw new Error('Cannot submit clicks at this time');
    }

    const participant = await prisma.gameParticipant.findFirst({
      where: {
        gameSessionId: parseInt(gameSessionId),
        profileId
      }
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const updated = await prisma.gameParticipant.update({
      where: { GameParticipantID: participant.GameParticipantID },
      data: {
        clickCount: parseInt(clickCount),
        hasSubmitted: true,
        submittedAt: new Date()
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true
          }
        },
        meal: true
      }
    });

    // Check if all participants have submitted
    const allParticipants = await prisma.gameParticipant.findMany({
      where: { gameSessionId: parseInt(gameSessionId) }
    });

    const allSubmitted = allParticipants.every(p => p.hasSubmitted);

    if (allSubmitted) {
      // Determine winner
      const winner = allParticipants.reduce((max, p) => 
        p.clickCount > max.clickCount ? p : max
      );

      await prisma.gameSession.update({
        where: { GameSessionID: parseInt(gameSessionId) },
        data: {
          status: 'completed',
          winnerId: winner.profileId,
          winningMealId: winner.mealId
        }
      });
    }

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error submitting click count:', error);
    throw error;
  }
}

/**
 * Get game session with full details
 */
async function getGameSession(gameSessionId) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        winner: {
          select: {
            id: true,
            username: true
          }
        },
        winningMeal: true,
        group: {
          select: {
            GroupID: true,
            name: true,
            description: true
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
            clickCount: 'desc'
          }
        }
      }
    });

    return gameSession;
  } catch (error) {
    console.error('[gamesLib] Error getting game session:', error);
    throw error;
  }
}

/**
 * Get active game session for a group
 */
async function getActiveGameSession(groupId) {
  try {
    const gameSession = await prisma.gameSession.findFirst({
      where: {
        groupId: parseInt(groupId),
        status: {
          in: ['waiting', 'ready', 'countdown', 'playing', 'submitting']
        }
      },
      include: {
        host: {
          select: {
            id: true,
            username: true
          }
        },
        group: {
          select: {
            GroupID: true,
            name: true
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return gameSession;
  } catch (error) {
    console.error('[gamesLib] Error getting active game session:', error);
    throw error;
  }
}

/**
 * Cancel a game session (host only)
 */
async function cancelGameSession(gameSessionId, hostId) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) }
    });

    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSession.hostId !== hostId) {
      throw new Error('Only the host can cancel the game');
    }

    if (gameSession.status === 'completed') {
      throw new Error('Cannot cancel a completed game');
    }

    const updated = await prisma.gameSession.update({
      where: { GameSessionID: parseInt(gameSessionId) },
      data: { status: 'cancelled' }
    });

    return updated;
  } catch (error) {
    console.error('[gamesLib] Error cancelling game session:', error);
    throw error;
  }
}

/**
 * Force complete game (host can skip waiting for all submissions)
 */
async function forceCompleteGame(gameSessionId, hostId) {
  try {
    const gameSession = await prisma.gameSession.findUnique({
      where: { GameSessionID: parseInt(gameSessionId) },
      include: {
        participants: {
          include: {
            profile: { select: { id: true, username: true } },
            meal: { select: { MealID: true, name: true } }
          }
        }
      }
    });

    if (!gameSession) {
      throw new Error('Game session not found');
    }

    if (gameSession.hostId !== hostId) {
      throw new Error('Only the host can force complete the game');
    }

    if (gameSession.status !== 'submitting') {
      throw new Error('Game must be in submitting state to force complete');
    }

    // Determine winner from submitted participants only
    const submittedParticipants = gameSession.participants.filter(p => p.hasSubmitted);

    if (submittedParticipants.length === 0) {
      throw new Error('At least one player must have submitted their score');
    }

    // Find winner (highest click count among submitted)
    const winner = submittedParticipants.reduce((prev, current) =>
      current.clickCount > prev.clickCount ? current : prev
    );

    const updatedGame = await prisma.gameSession.update({
      where: { GameSessionID: parseInt(gameSessionId) },
      data: {
        status: 'completed',
        winnerId: winner.profileId,
        winningMealId: winner.mealId
      },
      include: {
        participants: {
          include: {
            profile: { select: { id: true, username: true } },
            meal: { select: { MealID: true, name: true } }
          },
          orderBy: { clickCount: 'desc' }
        },
        winner: { select: { id: true, username: true } },
        winningMeal: { select: { MealID: true, name: true } }
      }
    });

    return updatedGame;
  } catch (error) {
    console.error('[gamesLib] Error forcing game completion:', error);
    throw error;
  }
}

module.exports = {
  createGameSession,
  joinGameSession,
  markPlayerReady,
  startGameCountdown,
  startGamePlaying,
  endGameTime,
  submitClickCount,
  getGameSession,
  getActiveGameSession,
  cancelGameSession,
  forceCompleteGame,
};
