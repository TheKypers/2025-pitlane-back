const { Server } = require('socket.io');

/**
 * Initialize Socket.IO server with proper CORS configuration
 * @param {import('http').Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initializeSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps)
        if (!origin) {
          return callback(null, true);
        }
        
        // For production/deployment, be more permissive
        if (process.env.NODE_ENV === 'production') {
          return callback(null, true);
        }
        
        // Allow any localhost or 127.0.0.1 origin for development
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          return callback(null, true);
        }
        
        // Allow Vercel deployments
        if (origin.includes('vercel.app')) {
          return callback(null, true);
        }
        
        // If none of the above, allow it anyway
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Connection event handler
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Handle group subscription
    socket.on('subscribe:group', (groupId) => {
      const roomName = `group:${groupId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined ${roomName}`);
    });

    // Handle group unsubscription
    socket.on('unsubscribe:group', (groupId) => {
      const roomName = `group:${groupId}`;
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left ${roomName}`);
    });

    // Handle voting session subscription
    socket.on('subscribe:voting-session', (sessionId) => {
      const roomName = `voting-session:${sessionId}`;
      socket.join(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} joined ${roomName}`);
    });

    // Handle voting session unsubscription
    socket.on('unsubscribe:voting-session', (sessionId) => {
      const roomName = `voting-session:${sessionId}`;
      socket.leave(roomName);
      console.log(`[Socket.IO] Socket ${socket.id} left ${roomName}`);
    });

    // Handle notification broadcast request
    socket.on('broadcast:notification', (data) => {
      const { groupId, notification } = data;
      if (!groupId || !notification) {
        console.warn('[Socket.IO] Invalid notification broadcast data:', data);
        return;
      }
      
      const roomName = `group:${groupId}`;
      console.log(`[Socket.IO] Broadcasting notification to ${roomName}:`, notification);
      io.to(roomName).emit('notification:broadcast', notification);
    });

    // Disconnection event handler
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`[Socket.IO] Socket error for ${socket.id}:`, error);
    });
  });

  console.log('[Socket.IO] Server initialized successfully');
  return io;
}

module.exports = { initializeSocketIO };
