import React from 'react';
import { BorrowItem } from './BorrowItem';
import { SupplyItem } from './SupplyItem';
import { DisplayPoolReserveInfo } from '../../types';

export const LendingRow: React.FC<{
  type: 'borrow' | 'supply';
  data: DisplayPoolReserveInfo;
}> = ({ type, data }) => {
  return (
    <div>
      {type === 'borrow' ? (
        <BorrowItem data={data} />
      ) : (
        <SupplyItem data={data} />
      )}
    </div>
  );
};
