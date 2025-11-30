import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseNotification from '../models/FirebaseNotification.js';
import notificationService from '../services/notificationService.js';
import User from '../models/User.js';

// Note: FCM (Firebase Cloud Messaging) is disabled. 
// FCM tokens are stored in MongoDB but push notifications are not sent.
// To re-enable push notifications, integrate an alternative service (e.g., OneSignal, Pusher).

const router = express.Router();

// Get user's notifications
router.get('/my-notifications', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, category, type, isRead } = req.query;
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    let filters = {};
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    
    const notifications = await FirebaseNotification.findByUser(userId, filters);
    
    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + limit);
    
    res.json({
      notifications: paginatedNotifications,
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notifications count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    const unreadNotifications = await FirebaseNotification.findUnreadByUser(userId);
    res.json({ count: unreadNotifications.length });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    const { id } = req.params;
    const notification = await FirebaseNotification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updatedNotification = await notification.markAsRead();
    res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark notification as unread
router.put('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    const { id } = req.params;
    const notification = await FirebaseNotification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const updatedNotification = await notification.markAsUnread();
    res.json(updatedNotification);
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    res.status(500).json({ error: 'Failed to mark notification as unread' });
  }
});

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    const count = await FirebaseNotification.markAllAsRead(userId);
    res.json({ message: `Marked ${count} notifications as read` });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    const { id } = req.params;
    const notification = await FirebaseNotification.findById(id);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    if (notification.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await FirebaseNotification.findByIdAndDelete(id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Admin routes
router.post('/admin/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, notificationData } = req.body;
    
    if (userIds && userIds.length > 0) {
      const notifications = await notificationService.sendBulkNotification(userIds, notificationData);
      res.json({ message: `Sent ${notifications.length} notifications`, notifications });
    } else {
      const notifications = await notificationService.sendBroadcastNotification(notificationData);
      res.json({ message: `Sent ${notifications.length} broadcast notifications`, notifications });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.post('/admin/send-by-criteria', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { criteria, notificationData } = req.body;
    
    const notifications = await notificationService.sendNotificationByCriteria(criteria, notificationData);
    res.json({ message: `Sent ${notifications.length} notifications`, notifications });
  } catch (error) {
    console.error('Error sending notification by criteria:', error);
    res.status(500).json({ error: 'Failed to send notification by criteria' });
  }
});

router.post('/admin/schedule', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, notificationData, scheduledFor } = req.body;
    
    if (!scheduledFor) {
      return res.status(400).json({ error: 'Scheduled time is required' });
    }
    
    const notifications = [];
    
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        const notification = await notificationService.scheduleNotification(userId, notificationData, scheduledFor);
        notifications.push(notification);
      }
    } else {
      // Schedule for all users
      const users = await User.find();
      for (const user of users) {
        const notification = await notificationService.scheduleNotification(user.id || user._id, notificationData, scheduledFor);
        notifications.push(notification);
      }
    }
    
    res.json({ message: `Scheduled ${notifications.length} notifications`, notifications });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    res.status(500).json({ error: 'Failed to schedule notification' });
  }
});

router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, category, type, isRead, limit = 50, offset = 0 } = req.query;
    
    let filters = {};
    if (userId) filters.userId = userId;
    if (category) filters.category = category;
    if (type) filters.type = type;
    if (isRead !== undefined) filters.isRead = isRead === 'true';
    
    const notifications = await FirebaseNotification.find(filters);
    
    // Apply pagination
    const paginatedNotifications = notifications.slice(offset, offset + limit);
    
    res.json({
      notifications: paginatedNotifications,
      total: notifications.length
    });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.query;
    const stats = await notificationService.getNotificationStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ error: 'Failed to fetch notification stats' });
  }
});

router.post('/admin/process-scheduled', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const count = await notificationService.processScheduledNotifications();
    res.json({ message: `Processed ${count} scheduled notifications` });
  } catch (error) {
    console.error('Error processing scheduled notifications:', error);
    res.status(500).json({ error: 'Failed to process scheduled notifications' });
  }
});

router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await FirebaseNotification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Specialized notification endpoints
router.post('/admin/subscription-expiry-warning', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    
    const notification = await notificationService.sendSubscriptionExpiryWarning(userId, subscription);
    res.json({ message: 'Subscription expiry warning sent', notification });
  } catch (error) {
    console.error('Error sending subscription expiry warning:', error);
    res.status(500).json({ error: 'Failed to send subscription expiry warning' });
  }
});

router.post('/admin/quiz-available', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, quiz } = req.body;
    
    const notifications = [];
    for (const userId of userIds) {
      const notification = await notificationService.sendQuizAvailable(userId, quiz);
      notifications.push(notification);
    }
    
    res.json({ message: `Quiz availability notifications sent to ${notifications.length} users`, notifications });
  } catch (error) {
    console.error('Error sending quiz availability notification:', error);
    res.status(500).json({ error: 'Failed to send quiz availability notification' });
  }
});

router.post('/admin/material-uploaded', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, material } = req.body;
    
    const notifications = [];
    for (const userId of userIds) {
      const notification = await notificationService.sendMaterialUploaded(userId, material);
      notifications.push(notification);
    }
    
    res.json({ message: `Material upload notifications sent to ${notifications.length} users`, notifications });
  } catch (error) {
    console.error('Error sending material upload notification:', error);
    res.status(500).json({ error: 'Failed to send material upload notification' });
  }
});

router.post('/admin/offer-available', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, offer } = req.body;
    
    const notifications = [];
    for (const userId of userIds) {
      const notification = await notificationService.sendOfferAvailable(userId, offer);
      notifications.push(notification);
    }
    
    res.json({ message: `Offer availability notifications sent to ${notifications.length} users`, notifications });
  } catch (error) {
    console.error('Error sending offer availability notification:', error);
    res.status(500).json({ error: 'Failed to send offer availability notification' });
  }
});

router.post('/admin/announcement', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userIds, announcement } = req.body;
    
    const notifications = [];
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        const notification = await notificationService.sendAnnouncement(userId, announcement);
        notifications.push(notification);
      }
    } else {
      const notifications = await notificationService.sendBroadcastNotification({
        title: announcement.title,
        message: announcement.message,
        type: 'info',
        category: 'announcement',
        priority: announcement.priority || 'medium',
        actionUrl: announcement.actionUrl,
        actionText: announcement.actionText,
        metadata: announcement.metadata || {}
      });
    }
    
    res.json({ message: `Announcement sent to ${notifications.length} users`, notifications });
  } catch (error) {
    console.error('Error sending announcement:', error);
    res.status(500).json({ error: 'Failed to send announcement' });
  }
});

// FCM Token Management Routes

// Register FCM token for user
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }
    
    // Get userId from req.user (could be id, _id, or userId)
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    
    if (!userId) {
      console.error('User ID not found in request:', req.user);
      return res.status(400).json({ error: 'User ID not found in token' });
    }
    
    // Use unified User model (MongoDB)
    try {
      // Try to find user by _id (MongoDB format) or id
      let user = await User.findById(userId);
      
      if (!user) {
        // Try by id field if _id didn't work
        user = await User.findOne({ id: userId });
      }
      
      if (!user) {
        console.error(`❌ User not found for FCM token registration: ${userId}`);
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Update FCM token
      user.fcmToken = token;
      user.fcmTokenUpdatedAt = new Date();
      await user.save();
      
      console.log(`✅ FCM token registered for user: ${userId}`);
      res.json({ message: 'FCM token registered successfully' });
    } catch (mongoError) {
      console.error('❌ Error updating FCM token in MongoDB:', mongoError);
      res.status(500).json({ 
        error: 'Failed to register FCM token',
        details: process.env.NODE_ENV === 'development' ? mongoError.message : 'Internal server error'
      });
    }
  } catch (error) {
    console.error('Error registering FCM token:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ 
      error: 'Failed to register FCM token', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Subscribe to topic
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    // Get user's FCM token from MongoDB
    let fcmToken = null;
    
    try {
      let user = await User.findById(userId);
      if (!user) {
        user = await User.findOne({ id: userId });
      }
      if (user) {
        fcmToken = user.fcmToken;
      }
    } catch (mongoError) {
      console.error('Error fetching user from MongoDB:', mongoError);
    }
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token not found. Please register token first.' });
    }
    
    // FCM is disabled - return success message
    // To re-enable push notifications, integrate an alternative service
    res.json({ 
      message: `Topic subscription request recorded for: ${topic}`,
      note: 'Push notifications are currently disabled. FCM token stored in MongoDB for future use.'
    });
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to subscribe to topic', details: error.message });
  }
});

// Unsubscribe from topic
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }
    
    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found' });
    }
    
    // Get user's FCM token from MongoDB
    let fcmToken = null;
    
    try {
      let user = await User.findById(userId);
      if (!user) {
        user = await User.findOne({ id: userId });
      }
      if (user) {
        fcmToken = user.fcmToken;
      }
    } catch (mongoError) {
      console.error('Error fetching user from MongoDB:', mongoError);
    }
    
    if (!fcmToken) {
      return res.status(400).json({ error: 'FCM token not found. Please register token first.' });
    }
    
    // FCM is disabled - return success message
    res.json({ 
      message: `Topic unsubscription request recorded for: ${topic}`,
      note: 'Push notifications are currently disabled.'
    });
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to unsubscribe from topic', details: error.message });
  }
});

// Send push notification to user (Admin only)
router.post('/send-push', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, title, body, data, imageUrl } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }
    
    // Get user's FCM token from MongoDB
    let user = await User.findById(userId);
    if (!user) {
      user = await User.findOne({ id: userId });
    }
    
    if (!user?.fcmToken) {
      return res.status(400).json({ error: 'User FCM token not found' });
    }
    
    // FCM is disabled - return success message
    // To re-enable push notifications, integrate an alternative service
    res.json({ 
      message: 'Push notification request recorded',
      note: 'Push notifications are currently disabled. FCM token stored in MongoDB for future use.'
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

// Send push notification to topic (Admin only)
router.post('/send-topic-push', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { topic, title, body, data, imageUrl } = req.body;
    
    if (!topic || !title || !body) {
      return res.status(400).json({ error: 'topic, title, and body are required' });
    }
    
    // FCM is disabled - return success message
    // To re-enable push notifications, integrate an alternative service
    res.json({ 
      message: `Topic push notification request recorded for: ${topic}`,
      note: 'Push notifications are currently disabled. FCM tokens stored in MongoDB for future use.'
    });
  } catch (error) {
    console.error('Error sending topic push notification:', error);
    res.status(500).json({ error: 'Failed to send topic push notification' });
  }
});

export default router;
