const { PrismaClient } = require('@prisma/client');
const votingSocketEmitter = require('./votingSocketEmitter');

// Create a base Prisma Client instance
const basePrisma = new PrismaClient();

// Store the extended client
let prisma = basePrisma;

/**
 * Initialize Prisma middleware to emit Socket.IO events on voting-related database changes
 * Uses Prisma Client Extensions (modern approach for Prisma 5+)
 */
function initializePrismaMiddleware() {
  console.log('[PrismaMiddleware] Initializing voting event middleware with Client Extensions');

  // Extend Prisma Client with query middleware
  prisma = basePrisma.$extends({
    name: 'votingEventEmitter',
    query: {
      votingSession: {
        async create({ args, query }) {
          const result = await query(args);
          
          // Emit event after creation
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const groupId = result.groupId;
              console.log(`[PrismaMiddleware] VotingSession created: ${result.VotingSessionID} for group ${groupId}`);
              
              // Fetch full session data with relations using basePrisma
              const fullSession = await basePrisma.votingSession.findUnique({
                where: { VotingSessionID: result.VotingSessionID },
                include: {
                  group: {
                    select: {
                      GroupID: true,
                      name: true,
                      description: true,
                      createdBy: true,
                      members: {
                        where: { isActive: true },
                        select: {
                          role: true,
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
                  initiator: {
                    select: {
                      id: true,
                      username: true
                    }
                  },
                  proposals: {
                    where: { isActive: true }
                  }
                }
              });

              votingSocketEmitter.emitVotingSessionCreated(groupId, fullSession);
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting VotingSession created event:', error);
          }
          
          return result;
        },
        
        async update({ args, query }) {
          const result = await query(args);
          
          // Emit event after update
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const sessionId = args.where.VotingSessionID;
              console.log(`[PrismaMiddleware] VotingSession updated: ${sessionId}`);
              
              // Fetch updated session with full data
              const fullSession = await basePrisma.votingSession.findUnique({
                where: { VotingSessionID: sessionId },
                include: {
                  group: {
                    select: {
                      GroupID: true,
                      name: true,
                      description: true,
                      createdBy: true,
                      members: {
                        where: { isActive: true },
                        select: {
                          role: true,
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
                  initiator: {
                    select: {
                      id: true,
                      username: true
                    }
                  },
                  proposals: {
                    where: { isActive: true },
                    include: {
                      meal: {
                        select: {
                          MealID: true,
                          name: true,
                          description: true,
                          profileId: true,
                          profile: {
                            select: {
                              id: true,
                              username: true
                            }
                          },
                          mealFoods: {
                            include: {
                              food: {
                                select: {
                                  FoodID: true,
                                  name: true,
                                  kCal: true,
                                  preferences: true,
                                  dietaryRestrictions: true
                                }
                              }
                            }
                          }
                        }
                      },
                      proposedBy: {
                        select: {
                          id: true,
                          username: true
                        }
                      },
                      votes: {
                        where: { isActive: true },
                        select: {
                          VoteID: true,
                          voterId: true,
                          voteType: true,
                          isActive: true
                        }
                      }
                    }
                  },
                  proposalConfirmations: true,
                  voteConfirmations: true
                }
              });

              if (fullSession) {
                const groupId = fullSession.groupId;
                
                // Check if status changed to voting_phase or completed
                const statusChanged = args.data.status !== undefined;
                if (statusChanged) {
                  if (args.data.status === 'voting_phase') {
                    votingSocketEmitter.emitVotingPhaseStarted(groupId, sessionId, fullSession);
                  } else if (args.data.status === 'completed') {
                    votingSocketEmitter.emitVotingCompleted(groupId, sessionId, fullSession);
                  }
                }
                
                // Always emit general update
                votingSocketEmitter.emitVotingSessionUpdated(groupId, sessionId, fullSession);
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting VotingSession update event:', error);
          }
          
          return result;
        }
      },
      
      mealProposal: {
        async create({ args, query }) {
          const result = await query(args);
          
          // Emit event after creation
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const proposalId = result.MealProposalID;
              console.log(`[PrismaMiddleware] MealProposal created: ${proposalId}`);
              
              // Fetch full proposal data
              const fullProposal = await basePrisma.mealProposal.findUnique({
                where: { MealProposalID: proposalId },
                include: {
                  meal: {
                    include: {
                      profile: {
                        select: {
                          id: true,
                          username: true
                        }
                      },
                      mealFoods: {
                        include: {
                          food: {
                            select: {
                              FoodID: true,
                              name: true,
                              kCal: true,
                              preferences: true,
                              dietaryRestrictions: true
                            }
                          }
                        }
                      }
                    }
                  },
                  proposedBy: {
                    select: {
                      id: true,
                      username: true
                    }
                  },
                  votingSession: {
                    select: {
                      VotingSessionID: true,
                      groupId: true
                    }
                  }
                }
              });

              if (fullProposal) {
                const { groupId, VotingSessionID } = fullProposal.votingSession;
                votingSocketEmitter.emitMealProposed(groupId, VotingSessionID, fullProposal);
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting MealProposal created event:', error);
          }
          
          return result;
        },
        
        async update({ args, query }) {
          const result = await query(args);
          
          // Emit event after update
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const proposalId = args.where.MealProposalID;
              console.log(`[PrismaMiddleware] MealProposal updated: ${proposalId}`);
              
              const fullProposal = await basePrisma.mealProposal.findUnique({
                where: { MealProposalID: proposalId },
                include: {
                  meal: {
                    select: {
                      MealID: true,
                      name: true,
                      description: true
                    }
                  },
                  votingSession: {
                    select: {
                      VotingSessionID: true,
                      groupId: true
                    }
                  },
                  votes: {
                    where: { isActive: true },
                    select: {
                      VoteID: true,
                      voterId: true,
                      voteType: true
                    }
                  }
                }
              });

              if (fullProposal) {
                const { groupId, VotingSessionID } = fullProposal.votingSession;
                // Emit updated session when proposal changes
                const updatedSession = await basePrisma.votingSession.findUnique({
                  where: { VotingSessionID },
                  include: {
                    group: {
                      select: {
                        GroupID: true,
                        name: true,
                        createdBy: true,
                        members: {
                          where: { isActive: true },
                          select: {
                            role: true,
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
                    proposals: {
                      where: { isActive: true },
                      include: {
                        meal: true,
                        votes: {
                          where: { isActive: true }
                        }
                      }
                    }
                  }
                });
                
                if (updatedSession) {
                  votingSocketEmitter.emitVotingSessionUpdated(groupId, VotingSessionID, updatedSession);
                }
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting MealProposal update event:', error);
          }
          
          return result;
        }
      },
      
      vote: {
        async create({ args, query }) {
          const result = await query(args);
          
          // Emit event after creation
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const voteId = result.VoteID;
              console.log(`[PrismaMiddleware] Vote created: ${voteId}`);
              
              // Fetch full vote data with related proposal
              const fullVote = await basePrisma.vote.findUnique({
                where: { VoteID: voteId },
                include: {
                  mealProposal: {
                    include: {
                      meal: {
                        select: {
                          MealID: true,
                          name: true
                        }
                      },
                      votingSession: {
                        select: {
                          VotingSessionID: true,
                          groupId: true
                        }
                      }
                    }
                  }
                }
              });

              if (fullVote && fullVote.mealProposal) {
                const { groupId, VotingSessionID } = fullVote.mealProposal.votingSession;
                
                // Fetch updated proposal with new vote count
                const updatedProposal = await basePrisma.mealProposal.findUnique({
                  where: { MealProposalID: fullVote.mealProposalId },
                  include: {
                    votes: {
                      where: { isActive: true }
                    },
                    meal: {
                      select: {
                        MealID: true,
                        name: true
                      }
                    }
                  }
                });

                votingSocketEmitter.emitVoteCast(groupId, VotingSessionID, fullVote, updatedProposal);
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting Vote created event:', error);
          }
          
          return result;
        }
      },
      
      proposalConfirmation: {
        async create({ args, query }) {
          const result = await query(args);
          
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const confirmation = await basePrisma.proposalConfirmation.findUnique({
                where: { ConfirmationID: result.ConfirmationID },
                include: {
                  votingSession: {
                    select: {
                      VotingSessionID: true,
                      groupId: true
                    }
                  }
                }
              });

              if (confirmation) {
                const { groupId, VotingSessionID } = confirmation.votingSession;
                votingSocketEmitter.emitUserConfirmedReady(groupId, VotingSessionID, confirmation);
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting ProposalConfirmation event:', error);
          }
          
          return result;
        }
      },
      
      voteConfirmation: {
        async create({ args, query }) {
          const result = await query(args);
          
          try {
            const io = votingSocketEmitter.getIO();
            if (io) {
              const confirmation = await basePrisma.voteConfirmation.findUnique({
                where: { ConfirmationID: result.ConfirmationID },
                include: {
                  votingSession: {
                    select: {
                      VotingSessionID: true,
                      groupId: true
                    }
                  }
                }
              });

              if (confirmation) {
                const { groupId, VotingSessionID } = confirmation.votingSession;
                votingSocketEmitter.emitUserConfirmedVotes(groupId, VotingSessionID, confirmation);
              }
            }
          } catch (error) {
            console.error('[PrismaMiddleware] Error emitting VoteConfirmation event:', error);
          }
          
          return result;
        }
      }
    }
  });

  console.log('[PrismaMiddleware] Voting event middleware initialized successfully with Client Extensions');
}

module.exports = { prisma, initializePrismaMiddleware };
