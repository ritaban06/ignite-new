import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Users, 
  Upload, 
  Download,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity
} from 'lucide-react';
import { pdfAPI } from '../api';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    overview: {
      totalUsers: 0,
      totalFolders: 0,
      recentUploads: 0
    },
    distribution: {
      byDepartment: [],
      byYear: []
    },
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheResult, setCacheResult] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await pdfAPI.getAnalytics();
      // console.log('Dashboard data:', response.data); // Debugging API response
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCacheDrivePdfs = async () => {
    setCacheLoading(true);
    setCacheResult(null);
    try {
      const res = await pdfAPI.cacheDrivePdfs();
      setCacheResult({ success: true, ...res.data });
    } catch (err) {
      setCacheResult({ success: false, error: err?.response?.data?.error || 'Failed to cache PDFs' });
    } finally {
      setCacheLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'primary', trend = null }) => (
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
              <span className="text-sm text-green-400">{trend}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-900`}>
          <Icon className={`h-6 w-6 text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-2 text-gray-400">
          {/* Welcome to the PDF repository admin dashboard */}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Root Folders"
          value={stats.overview.totalFolders}
          icon={FileText}
          color="primary"
        />
        {/* <StatCard
          title="Active PDFs"
          value={stats.overview.activePdfs}
          icon={Activity}
          color="blue"
        /> */}
        {/* <StatCard
          title="Recent Uploads (7 days)"
          value={stats.overview.recentUploads}
          icon={Upload}
          color="purple"
        /> */}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {/* <Link
              to="/upload"
              className="flex items-center p-3 text-left text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Upload className="h-5 w-5 text-primary-400 mr-3" />
              Upload New PDF
            </Link> */}
            <Link
              to="/folders"
              className="flex items-center p-3 text-left text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <FileText className="h-5 w-5 text-green-400 mr-3" />
              Manage folders
            </Link>
            <Link
              to="/users"
              className="flex items-center p-3 text-left text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Users className="h-5 w-5 text-blue-400 mr-3" />
              Manage Users
            </Link>
            <Link
              to="/analytics"
              className="flex items-center p-3 text-left text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              <BarChart3 className="h-5 w-5 text-purple-400 mr-3" />
              View Analytics
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center p-3 bg-gray-700 rounded-lg">
                  <Activity className="h-4 w-4 text-gray-400 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      {activity.user?.name || (activity.user?.role === 'admin' ? 'Admin' : 'Unknown User')} {activity.action} 
                      {activity.pdf ? ` "${activity.pdf.title}"` : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
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
      </div>

      {/* Department Distribution */}
      <div className="mt-8 bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
        <h2 className="text-lg font-medium text-white mb-4">Department Distribution</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {stats.distribution.byDepartment && stats.distribution.byDepartment.length > 0 ? (
            stats.distribution.byDepartment.map((dept) => (
              <div key={dept._id} className="text-center p-3 bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-primary-400">{dept.count}</p>
                <p className="text-sm text-gray-400">{dept._id}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No department data available</p>
            </div>
          )}
        </div>
        
        {/* Year Distribution */}
        <h3 className="text-md font-medium text-white mt-6 mb-4">Year Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.distribution.byYear && stats.distribution.byYear.length > 0 ? (
            stats.distribution.byYear.map((year) => (
              <div key={year._id} className="text-center p-3 bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{year.count}</p>
                <p className="text-sm text-gray-400">Year {year._id}</p>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-4">
              <p className="text-gray-400">No year data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
