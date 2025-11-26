import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BookOpen, 
  Trophy, 
  Clock,
  Target,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  Download,
  Eye,
  Star,
  MessageSquare,
  CreditCard,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalMaterials: number;
    totalDownloads: number;
    totalRevenue: number;
    conversionRate: number;
    engagementRate: number;
    retentionRate: number;
  };
  userGrowth: Array<{
    date: string;
    users: number;
    newUsers: number;
    activeUsers: number;
  }>;
  materialStats: {
    total: number;
    byType: Record<string, number>;
    byBranch: Record<string, number>;
    bySemester: Record<string, number>;
    topDownloads: Array<{
      id: string;
      title: string;
      downloads: number;
      rating: number;
    }>;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
    pagesPerSession: number;
  };
  revenue: {
    total: number;
    monthly: Array<{
      month: string;
      revenue: number;
      subscriptions: number;
    }>;
    byPlan: Record<string, number>;
    churnRate: number;
    ltv: number;
  };
  performance: {
    averageLoadTime: number;
    errorRate: number;
    uptime: number;
    apiResponseTime: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/comprehensive?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        throw new Error('Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Analytics</h3>
        <p className="text-gray-600 mb-4">Unable to fetch analytics data. Please try again.</p>
        <Button onClick={fetchAnalyticsData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into platform performance</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button onClick={fetchAnalyticsData} size="sm">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalUsers)}</p>
                <p className="text-xs text-gray-500">{data.overview.activeUsers} active</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.overview.totalRevenue)}</p>
                <p className="text-xs text-gray-500">{data.overview.conversionRate.toFixed(1)}% conversion</p>
              </div>
              <CreditCard className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement Rate</p>
                <p className="text-2xl font-bold text-gray-900">{data.overview.engagementRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">{data.overview.retentionRate.toFixed(1)}% retention</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalDownloads)}</p>
                <p className="text-xs text-gray-500">{data.overview.totalMaterials} materials</p>
              </div>
              <Download className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  User Growth
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Chart visualization would go here</p>
                    <p className="text-sm text-gray-500">Total: {data.userGrowth.length} data points</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{data.engagement.dailyActiveUsers}</p>
                    <p className="text-xs text-gray-600">Daily Active Users</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Clock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-green-600">{Math.round(data.engagement.averageSessionDuration)}m</p>
                    <p className="text-xs text-gray-600">Avg Session Duration</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-purple-600">{data.engagement.pagesPerSession.toFixed(1)}</p>
                  <p className="text-xs text-gray-600">Pages per Session</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{data.engagement.weeklyActiveUsers}</p>
                    <p className="text-xs text-gray-600">Weekly Active</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-green-600">{data.engagement.monthlyActiveUsers}</p>
                    <p className="text-xs text-gray-600">Monthly Active</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-yellow-600">{data.engagement.bounceRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">Bounce Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Retention chart would go here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">By Type</h4>
                  <div className="space-y-2">
                    {Object.entries(data.materialStats.byType).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">By Branch</h4>
                  <div className="space-y-2">
                    {Object.entries(data.materialStats.byBranch).map(([branch, count]) => (
                      <div key={branch} className="flex justify-between items-center">
                        <span className="text-sm">{branch}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.materialStats.topDownloads.slice(0, 5).map((material, index) => (
                    <div key={material.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{material.title}</p>
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-600">{material.rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{material.downloads}</p>
                        <p className="text-xs text-gray-600">downloads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <CreditCard className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(data.revenue.total)}</p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{data.revenue.ltv.toFixed(0)}</p>
                    <p className="text-xs text-gray-600">Customer LTV</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-red-600">{data.revenue.churnRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-600">Churn Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data.revenue.byPlan).map(([plan, revenue]) => (
                    <div key={plan} className="flex justify-between items-center p-3 border rounded-lg">
                      <span className="text-sm font-medium capitalize">{plan}</span>
                      <Badge variant="secondary">{formatCurrency(revenue)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-green-600">{data.performance.averageLoadTime}ms</p>
                    <p className="text-xs text-gray-600">Avg Load Time</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-xl font-bold text-blue-600">{data.performance.uptime.toFixed(2)}%</p>
                    <p className="text-xs text-gray-600">Uptime</p>
                  </div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-yellow-600">{data.performance.errorRate.toFixed(2)}%</p>
                  <p className="text-xs text-gray-600">Error Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">API response time chart would go here</p>
                    <p className="text-sm text-gray-500">Avg: {data.performance.apiResponseTime}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
