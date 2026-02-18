const Notification = require('../models/Notification');

// Socket.io instance
let io;

/**
 * Initialize socket service
 */
exports.initializeSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join user-specific room
    socket.on('join', (userId) => {
      socket.join(userId.toString());
      console.log(`User ${userId} joined their room`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

/**
 * Create and emit notification
 */
exports.createNotification = async (userId, notificationData) => {
  try {
    const notification = await Notification.create({
      user: userId,
      ...notificationData
    });

    // Emit to user's socket room if connected
    if (io) {
      io.to(userId.toString()).emit('notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    throw error;
  }
};

/**
 * Emit real-time event
 */
exports.emitToUser = (userId, event, data) => {
  if (io) {
    io.to(userId.toString()).emit(event, data);
  }
};

/**
 * Broadcast to all connected clients
 */
exports.broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};
