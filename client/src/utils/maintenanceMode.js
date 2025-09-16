/**
 * Utility functions for managing maintenance mode
 */

/**
 * Check if the application is currently in maintenance mode
 * @returns {boolean} True if maintenance mode is enabled
 */
export const isMaintenanceMode = () => {
  return import.meta.env.VITE_MAINTENANCE_MODE === 'true';
};

/**
 * Get maintenance mode configuration
 * @returns {object} Configuration object for maintenance mode
 */
export const getMaintenanceConfig = () => {
  return {
    enabled: isMaintenanceMode(),
    message: import.meta.env.VITE_MAINTENANCE_MESSAGE || 'We\'re making improvements to serve you better!',
    estimatedDuration: import.meta.env.VITE_MAINTENANCE_DURATION || 'a few hours',
    autoRefreshInterval: parseInt(import.meta.env.VITE_MAINTENANCE_REFRESH_INTERVAL) || 300000, // 5 minutes
  };
};

export default {
  isMaintenanceMode,
  getMaintenanceConfig,
};