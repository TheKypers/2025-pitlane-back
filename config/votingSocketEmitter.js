/**
 * Helper module to emit Socket.IO events for voting system
 * This module provides a clean interface to emit events from anywhere in the app
 */

let io = null;

/**
 * Initialize the socket emitter with the Socket.IO instance
 * @param {import('socket.io').Server} socketIO - Socket.IO server instance
 */
function initializeSocketEmitter(socketIO) {
  io = socketIO;
  console.log('[VotingSocketEmitter] Initialized with Socket.IO instance');
}

/**
 * Get the Socket.IO instance
 * @returns {import('socket.io').Server|null}
 */
function getIO() {
  return io;
}

/**
 * Emit event when a new voting session is created
 * @param {number} groupId - Group ID
 * @param {object} session - Voting session data
 */
function emitVotingSessionCreated(groupId, session) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const roomName = `group:${groupId}`;
  const room = io.sockets.adapter.rooms.get(roomName);
  const clientCount = room ? room.size : 0;
  console.log(`[VotingSocketEmitter] Emitting voting:session:created to ${roomName} (${clientCount} clients)`, { sessionId: session.VotingSessionID });
  io.to(roomName).emit('voting:session:created', session);
}

/**
 * Emit event when a voting session status changes
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} session - Updated voting session data
 */
function emitVotingSessionUpdated(groupId, sessionId, session) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  const groupRoomClients = io.sockets.adapter.rooms.get(groupRoom);
  const sessionRoomClients = io.sockets.adapter.rooms.get(sessionRoom);
  const groupCount = groupRoomClients ? groupRoomClients.size : 0;
  const sessionCount = sessionRoomClients ? sessionRoomClients.size : 0;
  
  console.log(`[VotingSocketEmitter] Emitting voting:session:updated to ${groupRoom} (${groupCount} clients) and ${sessionRoom} (${sessionCount} clients)`, { sessionId });
  io.to(groupRoom).emit('voting:session:updated', session);
  io.to(sessionRoom).emit('voting:session:updated', session);
}

/**
 * Emit event when a meal is proposed
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} proposal - Meal proposal data
 */
function emitMealProposed(groupId, sessionId, proposal) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  const groupRoomClients = io.sockets.adapter.rooms.get(groupRoom);
  const sessionRoomClients = io.sockets.adapter.rooms.get(sessionRoom);
  const groupCount = groupRoomClients ? groupRoomClients.size : 0;
  const sessionCount = sessionRoomClients ? sessionRoomClients.size : 0;
  
  console.log(`[VotingSocketEmitter] Emitting voting:meal:proposed to ${groupRoom} (${groupCount} clients) and ${sessionRoom} (${sessionCount} clients)`, { 
    sessionId, 
    proposalId: proposal.MealProposalID 
  });
  io.to(groupRoom).emit('voting:meal:proposed', proposal);
  io.to(sessionRoom).emit('voting:meal:proposed', proposal);
}

/**
 * Emit event when voting phase starts
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} session - Updated session data
 */
function emitVotingPhaseStarted(groupId, sessionId, session) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:phase:started to ${groupRoom} and ${sessionRoom}`, { sessionId });
  io.to(groupRoom).emit('voting:phase:started', session);
  io.to(sessionRoom).emit('voting:phase:started', session);
}

/**
 * Emit event when a vote is cast
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} vote - Vote data
 * @param {object} updatedProposal - Updated proposal with new vote count
 */
function emitVoteCast(groupId, sessionId, vote, updatedProposal) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:vote:cast to ${groupRoom} and ${sessionRoom}`, { 
    sessionId, 
    voteId: vote.VoteID 
  });
  io.to(groupRoom).emit('voting:vote:cast', { vote, proposal: updatedProposal });
  io.to(sessionRoom).emit('voting:vote:cast', { vote, proposal: updatedProposal });
}

/**
 * Emit event when voting session is completed
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} result - Voting result with winner
 */
function emitVotingCompleted(groupId, sessionId, result) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:completed to ${groupRoom} and ${sessionRoom}`, { 
    sessionId, 
    winnerId: result.winnerMealId 
  });
  io.to(groupRoom).emit('voting:completed', result);
  io.to(sessionRoom).emit('voting:completed', result);
}

/**
 * Emit event when a user confirms ready for voting
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} confirmation - Confirmation data
 */
function emitUserConfirmedReady(groupId, sessionId, confirmation) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:user:confirmed-ready to ${groupRoom} and ${sessionRoom}`, { 
    sessionId, 
    userId: confirmation.userId 
  });
  io.to(groupRoom).emit('voting:user:confirmed-ready', confirmation);
  io.to(sessionRoom).emit('voting:user:confirmed-ready', confirmation);
}

/**
 * Emit event when a user confirms their votes
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} confirmation - Confirmation data
 */
function emitUserConfirmedVotes(groupId, sessionId, confirmation) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:user:confirmed-votes to ${groupRoom} and ${sessionRoom}`, { 
    sessionId, 
    userId: confirmation.userId 
  });
  io.to(groupRoom).emit('voting:user:confirmed-votes', confirmation);
  io.to(sessionRoom).emit('voting:user:confirmed-votes', confirmation);
}

module.exports = {
  initializeSocketEmitter,
  getIO,
  emitVotingSessionCreated,
  emitVotingSessionUpdated,
  emitMealProposed,
  emitVotingPhaseStarted,
  emitVoteCast,
  emitVotingCompleted,
  emitUserConfirmedReady,
  emitUserConfirmedVotes
};
