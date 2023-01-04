import React from 'react';

export const AccountListSkeleton: React.FC<{
  width?: number;
  height?: number;
  align?: 'left' | 'center';
}> = ({ children, width, height, align = 'center' }) => {
  return (
    <div
      className="AccountList-skeleton"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '20px',
        margin: align === 'left' ? '0' : 'auto',
      }}
    >
      {children}
    </div>
  );
};
