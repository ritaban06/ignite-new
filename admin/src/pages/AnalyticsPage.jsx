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
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await pdfAPI.getAnalytics({ timeRange });
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-2 text-gray-300">
            Insights and statistics about your PDF repository
          </p>
        </div>
        
        <select
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7d" className="bg-gray-700 text-white">Last 7 days</option>
          <option value="30d" className="bg-gray-700 text-white">Last 30 days</option>
          <option value="90d" className="bg-gray-700 text-white">Last 90 days</option>
          <option value="1y" className="bg-gray-700 text-white">Last year</option>
        </select>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total PDFs"
          value={analytics?.totalPdfs || 0}
          icon={FileText}
          color="primary"
        />
        <StatCard
          title="Total Users"
          value={analytics?.totalUsers || 0}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Downloads"
          value={analytics?.totalDownloads || 0}
          icon={Download}
          color="blue"
        />
        <StatCard
          title="Total Views"
          value={analytics?.totalViews || 0}
          icon={Eye}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Department Distribution */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">PDFs by Department</h2>
          {analytics?.departmentStats ? (
            <div className="space-y-3">
              {Object.entries(analytics.departmentStats).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">{dept}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-600 rounded-full h-2 mr-3">
                      <div 
                        className="bg-primary-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / Math.max(...Object.values(analytics.departmentStats))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-8 text-right">{count}</span>
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
          {analytics?.yearStats ? (
            <div className="space-y-3">
              {Object.entries(analytics.yearStats).map(([year, count]) => (
                <div key={year} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Year {year}</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-600 rounded-full h-2 mr-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: `${(count / Math.max(...Object.values(analytics.yearStats))) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-8 text-right">{count}</span>
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
            {analytics.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center p-4 bg-gray-700 rounded-lg">
                <div className="flex-shrink-0">
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-white">{activity.description}</p>
                  <div className="flex items-center mt-1">
                    <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-xs text-gray-400">{activity.timestamp}</p>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Most Popular PDFs</h2>
        {analytics?.topPdfs && analytics.topPdfs.length > 0 ? (
          <div className="space-y-4">
            {analytics.topPdfs.map((pdf, index) => (
              <div key={pdf._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">#{index + 1}</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{pdf.title}</p>
                    <p className="text-xs text-gray-500">{pdf.department} • Year {pdf.year}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {pdf.downloadCount || 0}
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {pdf.viewCount || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No PDF data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
