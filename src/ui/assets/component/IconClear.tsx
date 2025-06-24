import { useThemeMode } from '@/ui/hooks/usePreference';
import React from 'react';
export const IconClearCC = ({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) => {
  const { isDarkTheme } = useThemeMode();
  const strokeColor = isDarkTheme ? '#babec5' : '#6A7587';
  const fillColor = isDarkTheme ? '#FFFFFF0F' : '#F2F4F7';
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
    >
      <rect width="20" height="20" rx="10" fill={fillColor} />
      <path
        d="M6 6L14 14"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 14L14 6"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
