import React from 'react';

export const CELL_WIDTH = {
  ASSET: '33%',
  REVOKE_FROM: '34%',
  GAS_FEE: '33%',
} as const;

export const Cell: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  return <div className="flex items-center gap-[8px] min-w-0">{children}</div>;
};

export const CellText: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  return (
    <span className="block truncate text-[13px] leading-[16px] font-medium text-r-neutral-title1">
      {children}
    </span>
  );
};
