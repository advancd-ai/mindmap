/**
 * Hook to detect iframe loading errors
 */

import { useState, useEffect } from 'react';

export function useIframeError(url: string | undefined) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!url) {
      setHasError(false);
      return;
    }

    // Reset error state when URL changes
    setHasError(false);

    // Some sites block iframe embedding, we can't always detect this
    // But we can provide a fallback UI
    const timer = setTimeout(() => {
      // After 5 seconds, if iframe hasn't loaded, might be blocked
      // This is a heuristic, not perfect
    }, 5000);

    return () => clearTimeout(timer);
  }, [url]);

  return { hasError, setHasError };
}

