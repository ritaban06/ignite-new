import React, { useState, useEffect } from 'react';
import { 
  BarChart3,
  TrendingUp,
  Download,
  Eye,
  Calendar,
  Users,
  FileText,
  Activity
} from 'lucide-react';
import { pdfAPI } from '../api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await pdfAPI.getAnalytics();
      console.log('Analytics data received:', response.data);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'primary' }) => (
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-sm text-green-400">{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-900 bg-opacity-40`}>
          <Icon className={`h-6 w-6 text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-gray-300">
            Insights and statistics about your PDF repository
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={analytics?.overview?.totalUsers || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total PDFs"
          value={analytics?.overview?.totalPdfs || 0}
          icon={FileText}
          color="primary"
        />
        <StatCard
          title="Active PDFs"
          value={analytics?.overview?.activePdfs || 0}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Total Views"
          value={analytics?.overview?.totalViews || 0}
          icon={Eye}
          color="purple"
        />
        <StatCard
          title="Recent Uploads (7d)"
          value={analytics?.overview?.recentUploads || 0}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Department Distribution */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">PDFs by Department</h2>
          {analytics?.distribution?.byDepartment && analytics.distribution.byDepartment.length > 0 ? (
            <div className="space-y-3">
              {analytics.distribution.byDepartment.map((dept) => (
                <div key={dept._id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{dept._id}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-600 rounded-full h-2 mr-3">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(dept.count / Math.max(...analytics.distribution.byDepartment.map(d => d.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-8 text-right">{dept.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </div>

        {/* Year Distribution */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">PDFs by Year</h2>
          {analytics?.distribution?.byYear && analytics.distribution.byYear.length > 0 ? (
            <div className="space-y-3">
              {analytics.distribution.byYear.map((year) => (
                <div key={year._id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Year {year._id}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-600 rounded-full h-2 mr-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(year.count / Math.max(...analytics.distribution.byYear.map(y => y.count))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-8 text-right">{year.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No data available</p>
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
        {analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {analytics.recentActivity.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center p-4 bg-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-white">
                    {activity.user?.name || (activity.user?.role === 'admin' ? 'Admin' : 'Unknown User')} {activity.action} 
                    {activity.pdf ? ` "${activity.pdf.title}"` : ''}
                  </p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No recent activity</p>
          </div>
        )}
      </div>

      {/* Top PDFs */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-medium text-white mb-4">Most Popular PDFs</h2>
        {analytics?.topPdfs && analytics.topPdfs.length > 0 ? (
          <div className="space-y-4">
            {analytics.topPdfs.map((pdf, index) => (
              <div key={pdf._id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">#{index + 1}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-white">{pdf.title}</p>
                    <p className="text-xs text-gray-400">{pdf.department} • Year {pdf.year}</p>
                    <p className="text-xs text-gray-500">by {pdf.uploadedBy}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {pdf.viewCount}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">No PDF data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
