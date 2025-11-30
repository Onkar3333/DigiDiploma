import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import FirebaseUser from '../models/FirebaseUser.js';
import FirebaseMaterial from '../models/FirebaseMaterial.js';
import FirebaseSubscription from '../models/FirebaseSubscription.js';
import FirebaseQuizAttempt from '../models/FirebaseQuizAttempt.js';
import FirebaseProgress from '../models/FirebaseProgress.js';

const router = express.Router();

// Get comprehensive analytics data
router.get('/comprehensive', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get all data in parallel
    const [
      userStats,
      materialStats,
      subscriptionStats,
      quizStats,
      progressStats,
      userGrowthData,
      revenueData
    ] = await Promise.all([
      getUserAnalytics(startDate, endDate),
      getMaterialAnalytics(startDate, endDate),
      getSubscriptionAnalytics(startDate, endDate),
      getQuizAnalytics(startDate, endDate),
      getProgressAnalytics(startDate, endDate),
      getUserGrowthData(startDate, endDate),
      getRevenueData(startDate, endDate)
    ]);

    // Calculate overview metrics
    const overview = {
      totalUsers: userStats.total,
      activeUsers: userStats.active,
      totalMaterials: materialStats.total,
      totalDownloads: materialStats.totalDownloads,
      totalRevenue: subscriptionStats.totalRevenue,
      conversionRate: userStats.total > 0 ? (subscriptionStats.total / userStats.total) * 100 : 0,
      engagementRate: userStats.total > 0 ? (progressStats.total / userStats.total) * 100 : 0,
      retentionRate: calculateRetentionRate(userStats)
    };

    // Calculate engagement metrics
    const engagement = {
      dailyActiveUsers: userStats.dailyActive,
      weeklyActiveUsers: userStats.weeklyActive,
      monthlyActiveUsers: userStats.monthlyActive,
      averageSessionDuration: progressStats.averageSessionDuration,
      bounceRate: calculateBounceRate(progressStats),
      pagesPerSession: progressStats.averagePagesPerSession
    };

    // Calculate performance metrics
    const performance = {
      averageLoadTime: 1200, // Mock data - would come from monitoring
      errorRate: 0.5, // Mock data
      uptime: 99.9, // Mock data
      apiResponseTime: 150 // Mock data
    };

    res.json({
      overview,
      userGrowth: userGrowthData,
      materialStats,
      engagement,
      revenue: revenueData,
      performance
    });
  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Get user analytics
async function getUserAnalytics(startDate, endDate) {
  try {
    const users = await FirebaseUser.find();
    const total = users.length;
    
    // Calculate active users (users with progress in date range)
    const activeUsers = await FirebaseProgress.find({
      updatedAt: { $gte: startDate, $lte: endDate }
    });
    const activeUserIds = new Set(activeUsers.map(p => p.userId));
    const active = activeUserIds.size;

    // Calculate daily, weekly, monthly active users
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dailyActive = await FirebaseProgress.find({
      updatedAt: { $gte: oneDayAgo }
    });
    const dailyActiveIds = new Set(dailyActive.map(p => p.userId));

    const weeklyActive = await FirebaseProgress.find({
      updatedAt: { $gte: oneWeekAgo }
    });
    const weeklyActiveIds = new Set(weeklyActive.map(p => p.userId));

    const monthlyActive = await FirebaseProgress.find({
      updatedAt: { $gte: oneMonthAgo }
    });
    const monthlyActiveIds = new Set(monthlyActive.map(p => p.userId));

    return {
      total,
      active,
      dailyActive: dailyActiveIds.size,
      weeklyActive: weeklyActiveIds.size,
      monthlyActive: monthlyActiveIds.size
    };
  } catch (error) {
    console.error('Error getting user analytics:', error);
    return { total: 0, active: 0, dailyActive: 0, weeklyActive: 0, monthlyActive: 0 };
  }
}

// Get material analytics
async function getMaterialAnalytics(startDate, endDate) {
  try {
    const materials = await FirebaseMaterial.find();
    const total = materials.length;
    
    let totalDownloads = 0;
    const byType = {};
    const byBranch = {};
    const bySemester = {};
    const topDownloads = [];

    materials.forEach(material => {
      totalDownloads += material.downloads || 0;
      
      // Count by type
      if (material.type) {
        byType[material.type] = (byType[material.type] || 0) + 1;
      }
      
      // Count by branch
      if (material.branch) {
        byBranch[material.branch] = (byBranch[material.branch] || 0) + 1;
      }
      
      // Count by semester
      if (material.semester) {
        bySemester[material.semester] = (bySemester[material.semester] || 0) + 1;
      }
      
      // Track top downloads
      topDownloads.push({
        id: material.id,
        title: material.title,
        downloads: material.downloads || 0,
        rating: material.rating || 0
      });
    });

    // Sort by downloads and take top 10
    topDownloads.sort((a, b) => b.downloads - a.downloads);

    return {
      total,
      totalDownloads,
      byType,
      byBranch,
      bySemester,
      topDownloads: topDownloads.slice(0, 10)
    };
  } catch (error) {
    console.error('Error getting material analytics:', error);
    return { total: 0, totalDownloads: 0, byType: {}, byBranch: {}, bySemester: {}, topDownloads: [] };
  }
}

// Get subscription analytics
async function getSubscriptionAnalytics(startDate, endDate) {
  try {
    const subscriptions = await FirebaseSubscription.find();
    const total = subscriptions.length;
    
    let totalRevenue = 0;
    const byPlan = {};

    subscriptions.forEach(subscription => {
      totalRevenue += subscription.price || 0;
      
      if (subscription.planType) {
        byPlan[subscription.planType] = (byPlan[subscription.planType] || 0) + (subscription.price || 0);
      }
    });

    return {
      total,
      totalRevenue,
      byPlan
    };
  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    return { total: 0, totalRevenue: 0, byPlan: {} };
  }
}

// Get quiz analytics
async function getQuizAnalytics(startDate, endDate) {
  try {
    const attempts = await FirebaseQuizAttempt.find();
    const total = attempts.length;
    
    let totalScore = 0;
    let passedAttempts = 0;
    let totalTime = 0;

    attempts.forEach(attempt => {
      totalScore += attempt.score || 0;
      totalTime += attempt.timeSpent || 0;
      if (attempt.passed) passedAttempts++;
    });

    return {
      total,
      averageScore: total > 0 ? totalScore / total : 0,
      passRate: total > 0 ? (passedAttempts / total) * 100 : 0,
      averageTime: total > 0 ? totalTime / total : 0
    };
  } catch (error) {
    console.error('Error getting quiz analytics:', error);
    return { total: 0, averageScore: 0, passRate: 0, averageTime: 0 };
  }
}

// Get progress analytics
async function getProgressAnalytics(startDate, endDate) {
  try {
    const progress = await FirebaseProgress.find();
    const total = progress.length;
    
    let totalTimeSpent = 0;
    let totalSessions = 0;
    let totalPages = 0;

    progress.forEach(p => {
      totalTimeSpent += p.timeSpent || 0;
      totalSessions += 1; // Each progress record is a session
      totalPages += 1; // Each progress record is a page view
    });

    return {
      total,
      averageSessionDuration: totalSessions > 0 ? totalTimeSpent / totalSessions : 0,
      averagePagesPerSession: totalSessions > 0 ? totalPages / totalSessions : 0
    };
  } catch (error) {
    console.error('Error getting progress analytics:', error);
    return { total: 0, averageSessionDuration: 0, averagePagesPerSession: 0 };
  }
}

// Get user growth data
async function getUserGrowthData(startDate, endDate) {
  try {
    const users = await FirebaseUser.find();
    const growthData = [];
    
    // Group users by creation date
    const userGroups = {};
    users.forEach(user => {
      const date = new Date(user.createdAt).toISOString().split('T')[0];
      if (!userGroups[date]) {
        userGroups[date] = { users: 0, newUsers: 0, activeUsers: 0 };
      }
      userGroups[date].users++;
      userGroups[date].newUsers++;
    });

    // Convert to array and sort by date
    Object.entries(userGroups).forEach(([date, data]) => {
      growthData.push({
        date,
        users: data.users,
        newUsers: data.newUsers,
        activeUsers: data.activeUsers
      });
    });

    return growthData.sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error getting user growth data:', error);
    return [];
  }
}

// Get revenue data
async function getRevenueData(startDate, endDate) {
  try {
    const subscriptions = await FirebaseSubscription.find();
    
    let total = 0;
    const monthly = {};
    const byPlan = {};

    subscriptions.forEach(subscription => {
      const amount = subscription.price || 0;
      total += amount;
      
      // Group by month
      const month = new Date(subscription.createdAt).toISOString().substring(0, 7);
      if (!monthly[month]) {
        monthly[month] = { revenue: 0, subscriptions: 0 };
      }
      monthly[month].revenue += amount;
      monthly[month].subscriptions++;
      
      // Group by plan
      const planType = subscription.planType || 'unknown';
      byPlan[planType] = (byPlan[planType] || 0) + amount;
    });

    // Convert monthly data to array
    const monthlyArray = Object.entries(monthly).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      subscriptions: data.subscriptions
    }));

    return {
      total,
      monthly: monthlyArray.sort((a, b) => a.month.localeCompare(b.month)),
      byPlan,
      churnRate: 5.2, // Mock data - would calculate from actual churn
      ltv: total / Math.max(subscriptions.length, 1) * 12 // Mock LTV calculation
    };
  } catch (error) {
    console.error('Error getting revenue data:', error);
    return { total: 0, monthly: [], byPlan: {}, churnRate: 0, ltv: 0 };
  }
}

// Helper functions
function calculateRetentionRate(userStats) {
  // Mock calculation - would use actual cohort analysis
  return 85.5;
}

function calculateBounceRate(progressStats) {
  // Mock calculation - would use actual session data
  return 35.2;
}

export default router;
