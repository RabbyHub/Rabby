import { useInterval } from 'ahooks';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';

const formatEndTime = (endTime: number) => {
  const diffMs = dayjs.unix(endTime).diff().valueOf();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffMonths / 12);

  const absDiffSeconds = Math.abs(diffSeconds);
  const absDiffMinutes = Math.abs(diffMinutes);
  const absDiffHours = Math.abs(diffHours);
  const absDiffDays = Math.abs(diffDays);
  const absDiffMonths = Math.abs(diffMonths);
  const absDiffYears = Math.abs(diffYears);

  const isFuture = diffMs > 0;
  let result = '';

  if (absDiffSeconds < 60) {
    result = `${absDiffSeconds} second${absDiffSeconds !== 1 ? 's' : ''}`;
  } else if (absDiffMinutes < 60) {
    result = `${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''}`;
  } else if (absDiffHours < 24) {
    result = `${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`;
  } else if (absDiffDays < 30) {
    result = `${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`;
  } else if (absDiffMonths < 12) {
    result = `${absDiffMonths} month${absDiffMonths !== 1 ? 's' : ''}`;
  } else {
    result = `${absDiffYears} year${absDiffYears !== 1 ? 's' : ''}`;
  }

  return isFuture ? result : `${result} ago`;
};

export const EndTime: React.FC<{
  end: number;
  className?: string;
  style?: React.CSSProperties;
  onEnd?: () => void;
}> = ({ end, className, style, onEnd }) => {
  const [key, setKey] = useState(0);

  const clearInterval = useInterval(() => {
    if (dayjs.unix(end).isBefore(dayjs())) {
      clearInterval();
      onEnd?.();
    }
    setKey((prev) => prev + 1);
  }, 1000);

  const { displayTime, fullTime } = useMemo(() => {
    const endTime = dayjs.unix(end);
    const displayTime = formatEndTime(end);
    const fullTime = endTime.format('YYYY-MM-DD HH:mm:ss');
    return {
      displayTime,
      fullTime,
    };
  }, [end, key]);

  return (
    <span title={fullTime} className={className} style={style}>
      {displayTime}
    </span>
  );
};
