/**
 * AdNotice - Overlay notice for Google AdSense
 * Displays a notice message and automatically disappears after 5 seconds
 */

import { useState, useEffect } from 'react';
import './AdNotice.css';

interface AdNoticeProps {
  message: string;
  duration?: number; // Duration in milliseconds (default: 5000)
  onClose?: () => void;
}

export default function AdNotice({ 
  message, 
  duration = 5000,
  onClose 
}: AdNoticeProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="ad-notice-overlay">
      <div className="ad-notice-content">
        <div className="ad-notice-icon">ℹ️</div>
        <div className="ad-notice-message">{message}</div>
      </div>
    </div>
  );
}

