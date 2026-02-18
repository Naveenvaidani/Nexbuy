const Notification = require('../models/Notification');
const { emitToUser } = require('./socketService');

/**
 * Create notification
 */
exports.createNotification = async (userId, data) => {
  try {
    const notification = await Notification.create({
      user: userId,
      ...data
    });

    // Emit real-time notification
    emitToUser(userId, 'notification', notification);

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
exports.getUserNotifications = async (userId, options = {}) => {
  const { limit = 20, skip = 0, unreadOnly = false } = options;

  const query = { user: userId };
  if (unreadOnly) {
    query.isRead = false;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({
    user: userId,
    isRead: false
  });

  return {
    notifications,
    unreadCount
  };
};

/**
 * Mark notification as read
 */
exports.markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  return await notification.markAsRead();
};

/**
 * Mark all as read
 */
exports.markAllAsRead = async (userId) => {
  await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

/**
 * Delete notification
 */
exports.deleteNotification = async (notificationId, userId) => {
  await Notification.deleteOne({
    _id: notificationId,
    user: userId
  });
};
