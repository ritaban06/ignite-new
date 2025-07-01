import React, { useState } from 'react';
import { 
  Settings as SettingsIcon,
  Save,
  Upload,
  Database,
  Mail,
  Shield,
  Bell,
  Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'PDF Repository',
    maxFileSize: '100',
    allowedFileTypes: ['pdf'],
    requireApproval: false,
    emailNotifications: true,
    maintenanceMode: false,
    autoBackup: true,
    backupFrequency: 'daily',
  });

  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const SettingsSection = ({ title, description, icon: Icon, children }) => (
    <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
      <div className="flex items-center mb-4">
        <Icon className="h-5 w-5 text-primary-400 mr-2" />
        <div>
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {description && <p className="text-sm text-gray-300 mt-1">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-gray-300">
          Configure your PDF repository settings and preferences
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* General Settings */}
        <SettingsSection 
          title="General Settings" 
          description="Basic configuration for your PDF repository"
          icon={SettingsIcon}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Site Name
              </label>
              <input
                type="text"
                name="siteName"
                className="block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={settings.siteName}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="maintenanceMode"
                name="maintenanceMode"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 bg-gray-700 border-gray-600 rounded"
                checked={settings.maintenanceMode}
                onChange={handleInputChange}
              />
              <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-white">
                Enable maintenance mode
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* File Upload Settings */}
        <SettingsSection 
          title="File Upload Settings" 
          description="Configure file upload restrictions and policies"
          icon={Upload}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Maximum File Size (MB)
              </label>
              <input
                type="number"
                name="maxFileSize"
                min="1"
                max="500"
                className="block w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={settings.maxFileSize}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireApproval"
                name="requireApproval"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 bg-gray-700 border-gray-600 rounded"
                checked={settings.requireApproval}
                onChange={handleInputChange}
              />
              <label htmlFor="requireApproval" className="ml-2 block text-sm text-white">
                Require admin approval for uploads
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* Email Notifications */}
        <SettingsSection 
          title="Email Notifications" 
          description="Configure email notification preferences"
          icon={Mail}
        >
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailNotifications"
                name="emailNotifications"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 bg-gray-700 border-gray-600 rounded"
                checked={settings.emailNotifications}
                onChange={handleInputChange}
              />
              <label htmlFor="emailNotifications" className="ml-2 block text-sm text-white">
                Enable email notifications
              </label>
            </div>
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection 
          title="Security Settings" 
          description="Manage security and access control settings"
          icon={Shield}
        >
          <div className="space-y-4">
            <div className="p-4 bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded-md">
              <div className="flex">
                <Shield className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-200">Security Notice</h4>
                  <p className="text-sm text-yellow-300 mt-1">
                    Security settings are managed at the server level. Contact your system administrator for changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Backup Settings */}
        <SettingsSection 
          title="Backup Settings" 
          description="Configure automatic backup preferences"
          icon={Database}
        >
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoBackup"
                name="autoBackup"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 bg-gray-700 border-gray-600 rounded"
                checked={settings.autoBackup}
                onChange={handleInputChange}
              />
              <label htmlFor="autoBackup" className="ml-2 block text-sm text-white">
                Enable automatic backups
              </label>
            </div>
            
            {settings.autoBackup && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Backup Frequency
                </label>
                <select
                  name="backupFrequency"
                  className="block w-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={settings.backupFrequency}
                  onChange={handleInputChange}
                >
                  <option value="daily" className="bg-gray-700 text-white">Daily</option>
                  <option value="weekly" className="bg-gray-700 text-white">Weekly</option>
                  <option value="monthly" className="bg-gray-700 text-white">Monthly</option>
                </select>
              </div>
            )}
          </div>
        </SettingsSection>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
