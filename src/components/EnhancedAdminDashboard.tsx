import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Users, 
  BookOpen, 
  FileText, 
  CreditCard, 
  Trophy, 
  Gift, 
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  Star,
  Download,
  Eye,
  MessageSquare,
  Target,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalStudents: number;
    totalAdmins: number;
    totalSubjects: number;
    totalMaterials: number;
    totalSubscriptions: number;
    totalRevenue: number;
    averageSubscriptionValue: number;
  };
  users: {
    total: number;
    students: number;
    admins: number;
    byBranch: Record<string, number>;
    bySemester: Record<string, number>;
    recentRegistrations: number;
  };
  materials: {
    total: number;
    byType: Record<string, number>;
    bySubject: Record<string, number>;
    totalDownloads: number;
    averageRating: number;
    totalRatings: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    revenue: number;
  };
  quizzes: {
    total: number;
    active: number;
    inactive: number;
    averageQuestions: number;
    attempts: {
      total: number;
      passed: number;
      failed: number;
      passRate: number;
      averageScore: number;
      averageTime: number;
    };
    participationRate: number;
  };
  offers: {
    total: number;
    active: number;
    expired: number;
    totalUses: number;
    totalSavings: number;
  };
  progress: {
    total: number;
    completed: number;
    bookmarked: number;
    averageProgress: number;
    totalTimeSpent: number;
    completionRate: number;
    engagementRate: number;
  };
  materialRequests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    fulfilled: number;
    averageUpvotes: number;
    topPriority: number;
    fulfillmentRate: number;
  };
  engagement: {
    studentEngagementRate: number;
    quizParticipationRate: number;
    materialRequestFulfillmentRate: number;
    averageProgress: number;
    completionRate: number;
  };
}

interface RecentActivity {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: any;
  material?: any;
  subscription?: any;
  attempt?: any;
  request?: any;
}

interface ChartData {
  userGrowth: Array<{ month: string; count: number }>;
  subscriptionRevenue: Array<{ month: string; revenue: number }>;
  materialUploads: Array<{ month: string; count: number }>;
  quizPerformance: {
    averageScore: number;
    passRate: number;
    totalAttempts: number;
    passedAttempts: number;
  };
  branchDistribution: Array<{ branch: string; count: number }>;
}

const EnhancedAdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, activityRes, chartsRes] = await Promise.all([
        fetch('/api/dashboard/admin/comprehensive-stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/dashboard/admin/recent-activity?limit=10', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/dashboard/admin/charts-data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setRecentActivity(activityData);
      }

      if (chartsRes.ok) {
        const chartsData = await chartsRes.json();
        setChartData(chartsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'material_upload':
        return <FileText className="h-4 w-4 text-green-600" />;
      case 'subscription_created':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'quiz_attempt':
        return <Trophy className="h-4 w-4 text-orange-600" />;
      case 'material_request':
        return <MessageSquare className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
        <p className="text-gray-600 mb-4">Unable to fetch dashboard data. Please try again.</p>
        <Button onClick={fetchDashboardData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalUsers}</p>
                <p className="text-xs text-gray-500">{stats.overview.totalStudents} students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Materials</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.totalMaterials}</p>
                <p className="text-xs text-gray-500">{stats.materials.totalDownloads} downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.overview.totalRevenue}</p>
                <p className="text-xs text-gray-500">{stats.overview.totalSubscriptions} subscriptions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{stats.engagement.studentEngagementRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">Quiz participation: {stats.engagement.quizParticipationRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-600">{stats.overview.totalSubjects}</p>
                    <p className="text-sm text-gray-600">Subjects</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600">{stats.quizzes.total}</p>
                    <p className="text-sm text-gray-600">Quizzes</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Gift className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-600">{stats.offers.active}</p>
                    <p className="text-sm text-gray-600">Active Offers</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <MessageSquare className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-600">{stats.materialRequests.pending}</p>
                    <p className="text-sm text-gray-600">Pending Requests</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getActivityIcon(activity.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-600 truncate">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">By Branch</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.users.byBranch).map(([branch, count]) => (
                        <div key={branch} className="flex justify-between items-center">
                          <span className="text-sm">{branch}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">By Semester</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.users.bySemester).map(([semester, count]) => (
                        <div key={semester} className="flex justify-between items-center">
                          <span className="text-sm">Semester {semester}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Chart visualization would go here</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Recent registrations: {stats.users.recentRegistrations} this week
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Material Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Download className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-blue-600">{stats.materials.totalDownloads}</p>
                      <p className="text-xs text-gray-600">Total Downloads</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-yellow-600">{stats.materials.averageRating.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">Average Rating</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">By Type</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.materials.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{type}</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <Target className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-green-600">{stats.quizzes.attempts.passRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">Pass Rate</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Trophy className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-blue-600">{stats.quizzes.attempts.averageScore.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">Avg Score</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-purple-600">{stats.quizzes.attempts.total}</p>
                    <p className="text-xs text-gray-600">Total Attempts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progress Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-green-600">{stats.progress.completionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">Completion Rate</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-blue-600">{Math.round(stats.progress.totalTimeSpent)}</p>
                      <p className="text-xs text-gray-600">Hours Spent</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-purple-600">{stats.progress.averageProgress.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">Average Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Material Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-yellow-600">{stats.materialRequests.pending}</p>
                      <p className="text-xs text-gray-600">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-green-600">{stats.materialRequests.fulfilled}</p>
                      <p className="text-xs text-gray-600">Fulfilled</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Target className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{stats.materialRequests.fulfillmentRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">Fulfillment Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-green-50 rounded-lg">
                    <CreditCard className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-3xl font-bold text-green-600">₹{stats.subscriptions.revenue}</p>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-xl font-bold text-blue-600">{stats.subscriptions.active}</p>
                      <p className="text-xs text-gray-600">Active Subscriptions</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-xl font-bold text-purple-600">₹{stats.overview.averageSubscriptionValue.toFixed(0)}</p>
                      <p className="text-xs text-gray-600">Avg Value</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offers & Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <Gift className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-orange-600">{stats.offers.totalUses}</p>
                      <p className="text-xs text-gray-600">Total Uses</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-xl font-bold text-green-600">₹{stats.offers.totalSavings}</p>
                      <p className="text-xs text-gray-600">Total Savings</p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Eye className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{stats.offers.active}</p>
                    <p className="text-xs text-gray-600">Active Offers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50">
                    <div className="p-2 bg-gray-100 rounded-full">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                        <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      {activity.user && (
                        <p className="text-xs text-gray-500 mt-1">
                          User: {activity.user.name} ({activity.user.email})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAdminDashboard;
