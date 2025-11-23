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

/**
 * Emit a broadcast notification to all users in a group
 * @param {number} groupId - Group ID
 * @param {object} notification - Notification data
 * @param {string} notification.id - Unique notification ID
 * @param {string} notification.type - Notification type (success, error, warning, info)
 * @param {string} notification.title - Notification title
 * @param {string} notification.message - Notification message
 */
function emitGroupNotification(groupId, notification) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping notification emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const room = io.sockets.adapter.rooms.get(groupRoom);
  const clientCount = room ? room.size : 0;
  
  console.log(`[VotingSocketEmitter] Emitting notification:broadcast to ${groupRoom} (${clientCount} clients)`, { 
    notificationId: notification.id,
    type: notification.type,
    title: notification.title
  });
  
  io.to(groupRoom).emit('notification:broadcast', notification);
}

/**
 * Emit event when a voting session is deleted
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 */
function emitVotingSessionDeleted(groupId, sessionId) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  console.log(`📡 Emitting voting:session:deleted for group ${groupId}, session ${sessionId}`);
  io.to(`group:${groupId}`).emit('voting:session:deleted', { sessionId });
}

/**
 * Emit event when a voting session is completed
 * @param {number} groupId - Group ID
 * @param {number} sessionId - Voting session ID
 * @param {object} session - Completed session data
 */
function emitVotingSessionCompleted(groupId, sessionId, session) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  const groupRoom = `group:${groupId}`;
  const sessionRoom = `voting-session:${sessionId}`;
  
  console.log(`[VotingSocketEmitter] Emitting voting:session:completed to ${groupRoom} and ${sessionRoom}`, { sessionId });
  io.to(groupRoom).emit('voting:session:completed', session);
  io.to(sessionRoom).emit('voting:session:completed', session);
}

/**
 * Emit event when a vote is removed
 * @param {number} sessionId - Voting session ID
 * @param {object} vote - Removed vote data
 */
function emitVoteRemoved(sessionId, vote) {
  if (!io) {
    console.warn('[VotingSocketEmitter] Socket.IO not initialized, skipping event emission');
    return;
  }
  
  console.log(`📡 Emitting voting:vote:removed for session ${sessionId}`);
  io.to(`session:${sessionId}`).emit('voting:vote:removed', vote);
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
  emitUserConfirmedVotes,
  emitGroupNotification,
  emitVotingSessionDeleted,
  emitVotingSessionCompleted,
  emitVoteRemoved
};
