/**
 * AdSense utility functions
 */

/**
 * Check if AdSense is enabled via environment variable
 * @returns true if AdSense is enabled, false otherwise
 */
export const isAdSenseEnabled = (): boolean => {
  const envValue = import.meta.env.VITE_ADSENSE_ENABLED;
  // Default to true if not set (backward compatibility)
  if (envValue === undefined || envValue === '') {
    return true;
  }
  // Accept 'true', '1', 'yes', 'on' as enabled
  return ['true', '1', 'yes', 'on'].includes(envValue.toLowerCase());
};

