import { useEffect, useState } from 'react';

/**
 * Returns countdown to next funding rate settlement (every hour on the hour in UTC)
 * Hyperliquid funding rates are settled every hour at :00:00 UTC
 * @returns Formatted countdown string like "59:45"
 */
export const useHourlyCountdown = () => {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Use UTC time for Hyperliquid funding rate calculations
      const minutes = now.getUTCMinutes();
      const seconds = now.getUTCSeconds();

      // Calculate seconds remaining until next hour (UTC)
      const remainingSeconds = (59 - minutes) * 60 + (60 - seconds);

      // Format as MM:SS
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formattedCountdown = `${String(mins).padStart(2, '0')}:${String(
        secs
      ).padStart(2, '0')}`;

      setCountdown(formattedCountdown);
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  return countdown;
};
