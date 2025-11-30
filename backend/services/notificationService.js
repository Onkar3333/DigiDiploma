import FirebaseNotification from '../models/FirebaseNotification.js';
import FirebaseUser from '../models/FirebaseUser.js';
import FirebaseSubscription from '../models/FirebaseSubscription.js';

class NotificationService {
  constructor() {
    this.emailService = null;
    this.pushService = null;
  }

  // Initialize email and push services
  initialize(emailService, pushService) {
    this.emailService = emailService;
    this.pushService = pushService;
  }

  // Send notification to single user
  async sendNotification(userId, notificationData) {
    try {
      const notification = await FirebaseNotification.create({
        userId,
        ...notificationData
      });

      // Send email if enabled
      if (this.emailService && notificationData.sendEmail !== false) {
        await this.sendEmailNotification(notification);
      }

      // Send push notification if enabled
      if (this.pushService && notificationData.sendPush !== false) {
        await this.sendPushNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send notification to multiple users
  async sendBulkNotification(userIds, notificationData) {
    try {
      const notifications = [];
      
      for (const userId of userIds) {
        const notification = await this.sendNotification(userId, notificationData);
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error sending bulk notification:', error);
      throw error;
    }
  }

  // Send notification to all users
  async sendBroadcastNotification(notificationData) {
    try {
      const users = await FirebaseUser.find();
      const userIds = users.map(user => user.id);
      
      return await this.sendBulkNotification(userIds, notificationData);
    } catch (error) {
      console.error('Error sending broadcast notification:', error);
      throw error;
    }
  }

  // Send notification to users by criteria
  async sendNotificationByCriteria(criteria, notificationData) {
    try {
      const users = await FirebaseUser.find(criteria);
      const userIds = users.map(user => user.id);
      
      return await this.sendBulkNotification(userIds, notificationData);
    } catch (error) {
      console.error('Error sending notification by criteria:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(notification) {
    try {
      if (!this.emailService) {
        console.log('Email service not configured');
        return;
      }

      const user = await FirebaseUser.findById(notification.userId);
      if (!user) {
        console.error('User not found for notification:', notification.id);
        return;
      }

      const emailData = {
        to: user.email,
        subject: notification.title,
        template: this.getEmailTemplate(notification.type),
        data: {
          userName: user.name,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actionText: notification.actionText,
          ...notification.metadata
        }
      };

      await this.emailService.sendEmail(emailData);
      await notification.markEmailSent();
      
      console.log(`Email notification sent to ${user.email}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  // Send push notification
  async sendPushNotification(notification) {
    try {
      if (!this.pushService) {
        console.log('Push service not configured');
        return;
      }

      const user = await FirebaseUser.findById(notification.userId);
      if (!user) {
        console.error('User not found for notification:', notification.id);
        return;
      }

      const pushData = {
        userId: notification.userId,
        title: notification.title,
        body: notification.message,
        data: {
          notificationId: notification.id,
          type: notification.type,
          category: notification.category,
          actionUrl: notification.actionUrl,
          ...notification.metadata
        }
      };

      await this.pushService.sendPush(pushData);
      await notification.markPushSent();
      
      console.log(`Push notification sent to user ${notification.userId}`);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Get email template based on notification type
  getEmailTemplate(type) {
    const templates = {
      'subscription': 'subscription-notification',
      'quiz': 'quiz-notification',
      'material': 'material-notification',
      'offer': 'offer-notification',
      'system': 'system-notification',
      'announcement': 'announcement-notification',
      'default': 'default-notification'
    };

    return templates[type] || templates['default'];
  }

  // Subscription-related notifications
  async sendSubscriptionExpiryWarning(userId, subscription) {
    const daysLeft = Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    return await this.sendNotification(userId, {
      title: 'Subscription Expiring Soon',
      message: `Your ${subscription.subscriptionType} subscription expires in ${daysLeft} days. Renew now to continue accessing premium features.`,
      type: 'warning',
      category: 'subscription',
      priority: 'high',
      actionUrl: '/subscriptions',
      actionText: 'Renew Subscription',
      metadata: {
        subscriptionId: subscription.id,
        daysLeft,
        subscriptionType: subscription.subscriptionType
      }
    });
  }

  async sendSubscriptionExpired(userId, subscription) {
    return await this.sendNotification(userId, {
      title: 'Subscription Expired',
      message: `Your ${subscription.subscriptionType} subscription has expired. Renew now to regain access to premium features.`,
      type: 'error',
      category: 'subscription',
      priority: 'urgent',
      actionUrl: '/subscriptions',
      actionText: 'Renew Subscription',
      metadata: {
        subscriptionId: subscription.id,
        subscriptionType: subscription.subscriptionType
      }
    });
  }

  async sendSubscriptionRenewed(userId, subscription) {
    return await this.sendNotification(userId, {
      title: 'Subscription Renewed',
      message: `Your ${subscription.subscriptionType} subscription has been successfully renewed. Thank you for your continued support!`,
      type: 'success',
      category: 'subscription',
      priority: 'medium',
      actionUrl: '/subscriptions',
      actionText: 'View Subscription',
      metadata: {
        subscriptionId: subscription.id,
        subscriptionType: subscription.subscriptionType
      }
    });
  }

  // Quiz-related notifications
  async sendQuizAvailable(userId, quiz) {
    return await this.sendNotification(userId, {
      title: 'New Quiz Available',
      message: `A new quiz "${quiz.title}" is now available for ${quiz.subjectName}. Test your knowledge!`,
      type: 'info',
      category: 'quiz',
      priority: 'medium',
      actionUrl: `/quizzes/${quiz.id}`,
      actionText: 'Take Quiz',
      metadata: {
        quizId: quiz.id,
        subjectName: quiz.subjectName,
        timeLimit: quiz.timeLimit
      }
    });
  }

  async sendQuizScore(userId, attempt) {
    const passed = attempt.passed ? 'passed' : 'failed';
    const emoji = attempt.passed ? '🎉' : '📚';
    
    return await this.sendNotification(userId, {
      title: `Quiz ${passed.charAt(0).toUpperCase() + passed.slice(1)} ${emoji}`,
      message: `You ${passed} the quiz "${attempt.quizTitle}" with a score of ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage.toFixed(1)}%).`,
      type: attempt.passed ? 'success' : 'info',
      category: 'quiz',
      priority: 'medium',
      actionUrl: `/quizzes/${attempt.quizId}/results`,
      actionText: 'View Results',
      metadata: {
        quizId: attempt.quizId,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        percentage: attempt.percentage,
        passed: attempt.passed
      }
    });
  }

  // Material-related notifications
  async sendMaterialUploaded(userId, material) {
    return await this.sendNotification(userId, {
      title: 'New Material Available',
      message: `New ${material.type} material "${material.title}" has been uploaded for ${material.subjectName}.`,
      type: 'info',
      category: 'material',
      priority: 'medium',
      actionUrl: `/materials/${material.id}`,
      actionText: 'View Material',
      metadata: {
        materialId: material.id,
        materialType: material.type,
        subjectName: material.subjectName
      }
    });
  }

  async sendMaterialRequestFulfilled(userId, request) {
    return await this.sendNotification(userId, {
      title: 'Material Request Fulfilled',
      message: `Your request for "${request.title}" has been fulfilled. The material is now available for download.`,
      type: 'success',
      category: 'material',
      priority: 'medium',
      actionUrl: '/materials',
      actionText: 'View Materials',
      metadata: {
        requestId: request.id,
        materialTitle: request.title
      }
    });
  }

  // Offer-related notifications
  async sendOfferAvailable(userId, offer) {
    return await this.sendNotification(userId, {
      title: 'Special Offer Available',
      message: `Limited time offer: ${offer.title}. Get ${offer.discountValue}% off on your subscription!`,
      type: 'info',
      category: 'offer',
      priority: 'high',
      actionUrl: '/offers',
      actionText: 'View Offer',
      metadata: {
        offerId: offer.id,
        discountValue: offer.discountValue,
        discountType: offer.discountType
      }
    });
  }

  // System notifications
  async sendSystemMaintenance(userId, maintenanceData) {
    return await this.sendNotification(userId, {
      title: 'System Maintenance Scheduled',
      message: `Scheduled maintenance will occur on ${maintenanceData.date} from ${maintenanceData.startTime} to ${maintenanceData.endTime}.`,
      type: 'warning',
      category: 'system',
      priority: 'high',
      actionUrl: '/maintenance',
      actionText: 'Learn More',
      metadata: {
        maintenanceDate: maintenanceData.date,
        startTime: maintenanceData.startTime,
        endTime: maintenanceData.endTime
      }
    });
  }

  // Announcement notifications
  async sendAnnouncement(userId, announcement) {
    return await this.sendNotification(userId, {
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

  // Schedule notification for future delivery
  async scheduleNotification(userId, notificationData, scheduledFor) {
    try {
      const notification = await FirebaseNotification.create({
        userId,
        ...notificationData,
        scheduledFor
      });

      return notification;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  // Process scheduled notifications
  async processScheduledNotifications() {
    try {
      const scheduledNotifications = await FirebaseNotification.findScheduled();
      
      for (const notification of scheduledNotifications) {
        // Send the notification
        if (this.emailService) {
          await this.sendEmailNotification(notification);
        }
        
        if (this.pushService) {
          await this.sendPushNotification(notification);
        }
        
        // Remove scheduled time
        notification.scheduledFor = null;
        await notification.save();
      }

      console.log(`Processed ${scheduledNotifications.length} scheduled notifications`);
      return scheduledNotifications.length;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      throw error;
    }
  }

  // Get notification statistics
  async getNotificationStats(userId = null) {
    try {
      return await FirebaseNotification.getStats(userId);
    } catch (error) {
      console.error('Error getting notification stats:', error);
      return { total: 0, unread: 0, read: 0, emailSent: 0, pushSent: 0, byType: {}, byCategory: {} };
    }
  }
}

export default new NotificationService();
