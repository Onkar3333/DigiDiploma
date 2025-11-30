import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import Subject from '../models/Subject.js';
import Material from '../models/Material.js';
// Note: Subscription, Quiz, Offer, Progress, MaterialRequest models may need MongoDB equivalents
// For now, these will use their existing models which should work with MongoDB
import FirebaseSubscription from '../models/FirebaseSubscription.js';
import FirebaseQuiz from '../models/FirebaseQuiz.js';
import FirebaseQuizAttempt from '../models/FirebaseQuizAttempt.js';
import FirebaseOffer from '../models/FirebaseOffer.js';
import FirebaseProgress from '../models/FirebaseProgress.js';
import FirebaseMaterialRequest from '../models/FirebaseMaterialRequest.js';

const router = express.Router();

// Get comprehensive dashboard statistics
router.get('/admin/comprehensive-stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all statistics in parallel
    const [
      userStats,
      subjectStats,
      materialStats,
      subscriptionStats,
      quizStats,
      quizAttemptStats,
      offerStats,
      progressStats,
      materialRequestStats
    ] = await Promise.all([
      getUserStats(),
      getSubjectStats(),
      getMaterialStats(),
      FirebaseSubscription.getStats(),
      FirebaseQuiz.getStats(),
      FirebaseQuizAttempt.getStats(),
      FirebaseOffer.getStats(),
      FirebaseProgress.getStats(),
      FirebaseMaterialRequest.getStats()
    ]);

    // Calculate additional metrics
    const totalRevenue = subscriptionStats.revenue || 0;
    const averageSubscriptionValue = subscriptionStats.total > 0 ? totalRevenue / subscriptionStats.total : 0;
    const studentEngagementRate = userStats.total > 0 ? (progressStats.total / userStats.total) * 100 : 0;
    const quizParticipationRate = userStats.total > 0 ? (quizAttemptStats.total / userStats.total) * 100 : 0;
    const materialRequestFulfillmentRate = materialRequestStats.total > 0 ? (materialRequestStats.fulfilled / materialRequestStats.total) * 100 : 0;

    res.json({
      overview: {
        totalUsers: userStats.total,
        totalStudents: userStats.students,
        totalAdmins: userStats.admins,
        totalSubjects: subjectStats.total,
        totalMaterials: materialStats.total,
        totalSubscriptions: subscriptionStats.total,
        totalRevenue: totalRevenue,
        averageSubscriptionValue: averageSubscriptionValue
      },
      users: userStats,
      subjects: subjectStats,
      materials: materialStats,
      subscriptions: subscriptionStats,
      quizzes: {
        ...quizStats,
        attempts: quizAttemptStats,
        participationRate: quizParticipationRate
      },
      offers: offerStats,
      progress: {
        ...progressStats,
        engagementRate: studentEngagementRate
      },
      materialRequests: {
        ...materialRequestStats,
        fulfillmentRate: materialRequestFulfillmentRate
      },
      engagement: {
        studentEngagementRate,
        quizParticipationRate,
        materialRequestFulfillmentRate,
        averageProgress: progressStats.averageProgress,
        completionRate: progressStats.completionRate
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive stats:', error);
    res.status(500).json({ error: 'Failed to fetch comprehensive statistics' });
  }
});

// Get user statistics
async function getUserStats() {
  try {
      const users = await User.find();
    const stats = {
      total: users.length,
      students: 0,
      admins: 0,
      byBranch: {},
      bySemester: {},
      recentRegistrations: 0
    };

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    users.forEach(user => {
      // Count by user type
      if (user.userType === 'student') {
        stats.students++;
      } else if (user.userType === 'admin') {
        stats.admins++;
      }

      // Count by branch
      if (user.branch) {
        stats.byBranch[user.branch] = (stats.byBranch[user.branch] || 0) + 1;
      }

      // Count by semester
      if (user.semester) {
        stats.bySemester[user.semester] = (stats.bySemester[user.semester] || 0) + 1;
      }

      // Count recent registrations
      if (new Date(user.createdAt) > oneWeekAgo) {
        stats.recentRegistrations++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return { total: 0, students: 0, admins: 0, byBranch: {}, bySemester: {}, recentRegistrations: 0 };
  }
}

// Get subject statistics
async function getSubjectStats() {
  try {
      const subjects = await Subject.find();
    const stats = {
      total: subjects.length,
      byBranch: {},
      bySemester: {},
      byType: {}
    };

    subjects.forEach(subject => {
      // Count by branch
      if (subject.branch) {
        stats.byBranch[subject.branch] = (stats.byBranch[subject.branch] || 0) + 1;
      }

      // Count by semester
      if (subject.semester) {
        stats.bySemester[subject.semester] = (stats.bySemester[subject.semester] || 0) + 1;
      }

      // Count by type
      if (subject.type) {
        stats.byType[subject.type] = (stats.byType[subject.type] || 0) + 1;
      }
    });

    return stats;
  } catch (error) {
    console.error('Error getting subject stats:', error);
    return { total: 0, byBranch: {}, bySemester: {}, byType: {} };
  }
}

// Get material statistics
async function getMaterialStats() {
  try {
      const materials = await Material.find();
    const stats = {
      total: materials.length,
      byType: {},
      bySubject: {},
      byBranch: {},
      bySemester: {},
      totalDownloads: 0,
      averageRating: 0,
      totalRatings: 0
    };

    let totalRatingSum = 0;
    let totalRatingCount = 0;

    materials.forEach(material => {
      // Count by type
      if (material.type) {
        stats.byType[material.type] = (stats.byType[material.type] || 0) + 1;
      }

      // Count by subject
      if (material.subjectName) {
        stats.bySubject[material.subjectName] = (stats.bySubject[material.subjectName] || 0) + 1;
      }

      // Count by branch
      if (material.branch) {
        stats.byBranch[material.branch] = (stats.byBranch[material.branch] || 0) + 1;
      }

      // Count by semester
      if (material.semester) {
        stats.bySemester[material.semester] = (stats.bySemester[material.semester] || 0) + 1;
      }

      // Sum downloads and ratings
      stats.totalDownloads += material.downloads || 0;
      totalRatingSum += (material.rating || 0) * (material.ratingCount || 0);
      totalRatingCount += material.ratingCount || 0;
    });

    stats.averageRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;
    stats.totalRatings = totalRatingCount;

    return stats;
  } catch (error) {
    console.error('Error getting material stats:', error);
    return { total: 0, byType: {}, bySubject: {}, byBranch: {}, bySemester: {}, totalDownloads: 0, averageRating: 0, totalRatings: 0 };
  }
}

// Get recent activity
router.get('/admin/recent-activity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get recent activities from different collections
    const [
      recentUsers,
      recentMaterials,
      recentSubscriptions,
      recentQuizAttempts,
      recentMaterialRequests
    ] = await Promise.all([
      getRecentUsers(limit),
      getRecentMaterials(limit),
      getRecentSubscriptions(limit),
      getRecentQuizAttempts(limit),
      getRecentMaterialRequests(limit)
    ]);

    // Combine and sort by date
    const activities = [
      ...recentUsers.map(user => ({
        type: 'user_registration',
        title: 'New User Registration',
        description: `${user.name} (${user.email}) registered`,
        timestamp: user.createdAt,
        user: user
      })),
      ...recentMaterials.map(material => ({
        type: 'material_upload',
        title: 'New Material Uploaded',
        description: `${material.title} uploaded for ${material.subjectName}`,
        timestamp: material.createdAt,
        material: material
      })),
      ...recentSubscriptions.map(subscription => ({
        type: 'subscription_created',
        title: 'New Subscription',
        description: `${subscription.subscriptionType} subscription created`,
        timestamp: subscription.createdAt,
        subscription: subscription
      })),
      ...recentQuizAttempts.map(attempt => ({
        type: 'quiz_attempt',
        title: 'Quiz Attempt Completed',
        description: `${attempt.quizTitle} - Score: ${attempt.score}/${attempt.totalQuestions}`,
        timestamp: attempt.completedAt || attempt.createdAt,
        attempt: attempt
      })),
      ...recentMaterialRequests.map(request => ({
        type: 'material_request',
        title: 'Material Request',
        description: `${request.title} requested for ${request.subjectName}`,
        timestamp: request.createdAt,
        request: request
      }))
    ];

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, limit));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

// Helper functions for recent activity
async function getRecentUsers(limit) {
  try {
      const users = await User.find();
    return users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function getRecentMaterials(limit) {
  try {
      const materials = await Material.find();
    return materials
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function getRecentSubscriptions(limit) {
  try {
    const subscriptions = await FirebaseSubscription.find();
    return subscriptions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function getRecentQuizAttempts(limit) {
  try {
    const attempts = await FirebaseQuizAttempt.find();
    return attempts
      .filter(attempt => attempt.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

async function getRecentMaterialRequests(limit) {
  try {
    const requests = await FirebaseMaterialRequest.find();
    return requests
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
}

// Get dashboard charts data
router.get('/admin/charts-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      userGrowthData,
      subscriptionRevenueData,
      materialUploadData,
      quizPerformanceData,
      branchDistributionData
    ] = await Promise.all([
      getUserGrowthData(),
      getSubscriptionRevenueData(),
      getMaterialUploadData(),
      getQuizPerformanceData(),
      getBranchDistributionData()
    ]);

    res.json({
      userGrowth: userGrowthData,
      subscriptionRevenue: subscriptionRevenueData,
      materialUploads: materialUploadData,
      quizPerformance: quizPerformanceData,
      branchDistribution: branchDistributionData
    });
  } catch (error) {
    console.error('Error fetching charts data:', error);
    res.status(500).json({ error: 'Failed to fetch charts data' });
  }
});

// Helper functions for charts data
async function getUserGrowthData() {
  try {
      const users = await User.find();
    const monthlyData = {};
    
    users.forEach(user => {
      const month = new Date(user.createdAt).toISOString().substring(0, 7); // YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  } catch (error) {
    return [];
  }
}

async function getSubscriptionRevenueData() {
  try {
    const subscriptions = await FirebaseSubscription.find();
    const monthlyData = {};
    
    subscriptions.forEach(subscription => {
      const month = new Date(subscription.createdAt).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + (subscription.price || 0);
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  } catch (error) {
    return [];
  }
}

async function getMaterialUploadData() {
  try {
      const materials = await Material.find();
    const monthlyData = {};
    
    materials.forEach(material => {
      const month = new Date(material.createdAt).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  } catch (error) {
    return [];
  }
}

async function getQuizPerformanceData() {
  try {
    const attempts = await FirebaseQuizAttempt.find();
    const performanceData = {
      averageScore: 0,
      passRate: 0,
      totalAttempts: attempts.length,
      passedAttempts: 0
    };

    if (attempts.length > 0) {
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
      performanceData.averageScore = totalScore / attempts.length;
      performanceData.passedAttempts = attempts.filter(attempt => attempt.passed).length;
      performanceData.passRate = (performanceData.passedAttempts / attempts.length) * 100;
    }

    return performanceData;
  } catch (error) {
    return { averageScore: 0, passRate: 0, totalAttempts: 0, passedAttempts: 0 };
  }
}

async function getBranchDistributionData() {
  try {
      const users = await User.find();
    const branchData = {};
    
    users.forEach(user => {
      if (user.branch) {
        branchData[user.branch] = (branchData[user.branch] || 0) + 1;
      }
    });

    return Object.entries(branchData)
      .map(([branch, count]) => ({ branch, count }));
  } catch (error) {
    return [];
  }
}

export default router;
