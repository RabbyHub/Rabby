import React from 'react';
export const IconCopyCC = ({
  strokeColor,
  className,
}: {
  strokeColor: string;
  className?: string;
}) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="6.5"
        y="0.5"
        width="13"
        height="11"
        rx="1.5"
        fill="currentColor"
        stroke={strokeColor}
      />
      <rect
        x="0.5"
        y="6.5"
        width="15"
        height="13"
        rx="1.5"
        fill="currentColor"
        stroke={strokeColor}
      />
    </svg>
  );
};
