/**
 * GoogleAdSense - Google AdSense advertisement component
 */

import { useEffect } from 'react';
import { isAdSenseEnabled } from '../utils/adsense';
import './GoogleAdSense.css';

interface GoogleAdSenseProps {
  adSlot?: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  fullWidthResponsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export default function GoogleAdSense({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  style,
  className = ''
}: GoogleAdSenseProps) {
  // Return null if AdSense is disabled
  if (!isAdSenseEnabled()) {
    return null;
  }

  useEffect(() => {
    try {
      // Initialize adsbygoogle array if it doesn't exist
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{
        display: 'block',
        ...style
      }}
      data-ad-client="ca-pub-6929869719862616"
      data-ad-slot={adSlot}
      data-ad-format={adFormat}
      data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
    />
  );
}

