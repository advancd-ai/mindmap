/**
 * AdSense utility functions
 */

import { getRuntimeAdsenseEnabled } from '../config/runtime';

/**
 * Check if AdSense is enabled via environment variable
 * @returns true if AdSense is enabled, false otherwise
 */
export const isAdSenseEnabled = (): boolean => getRuntimeAdsenseEnabled();

