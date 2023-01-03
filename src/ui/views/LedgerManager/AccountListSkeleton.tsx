import React from 'react';

export const AccountListSkeleton: React.FC<{
  width?: number;
  height?: number;
}> = ({ children, width, height }) => {
  return (
    <div
      className="AccountList-skeleton"
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '20px',
      }}
    >
      {children}
    </div>
  );
};
