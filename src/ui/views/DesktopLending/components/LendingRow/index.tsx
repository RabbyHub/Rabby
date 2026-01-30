import React from 'react';
import { BorrowItem } from './BorrowItem';
import { SupplyItem } from './SupplyItem';
import { DisplayPoolReserveInfo } from '../../types';

export const LendingRow: React.FC<{
  type: 'borrow' | 'supply';
  data: DisplayPoolReserveInfo;
  onSupply?: (data: DisplayPoolReserveInfo) => void;
  onBorrow?: (data: DisplayPoolReserveInfo) => void;
  onRepay?: (data: DisplayPoolReserveInfo) => void;
  onWithdraw?: (data: DisplayPoolReserveInfo) => void;
  onToggleCollateral?: (data: DisplayPoolReserveInfo) => void;
}> = ({
  type,
  data,
  onSupply,
  onBorrow,
  onRepay,
  onWithdraw,
  onToggleCollateral,
}) => {
  return (
    <div>
      {type === 'borrow' ? (
        <BorrowItem data={data} onBorrow={onBorrow} onRepay={onRepay} />
      ) : (
        <SupplyItem
          data={data}
          onSupply={onSupply}
          onWithdraw={onWithdraw}
          onToggleCollateral={onToggleCollateral}
        />
      )}
    </div>
  );
};
