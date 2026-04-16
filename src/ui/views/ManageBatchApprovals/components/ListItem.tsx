import React from 'react';

import { AssetApprovalSpenderWithStatus } from '../hooks/useBatchRevokeTask';
import { ListItemAsset } from './ListItemAsset';
import { ListItemSpender } from './ListItemSpender';
import { ListItemStatus } from './ListItemStatus';
import { CELL_WIDTH } from './Cell';

export const ListItem: React.FC<{
  item: AssetApprovalSpenderWithStatus;
  isPaused: boolean;
  onStillRevoke: (record: AssetApprovalSpenderWithStatus) => void;
}> = ({ item, isPaused, onStillRevoke }) => {
  return (
    <div className="px-[12px] py-[10px] flex items-center gap-[8px]">
      <div style={{ width: CELL_WIDTH.ASSET }}>
        <ListItemAsset data={item} />
      </div>
      <div style={{ width: CELL_WIDTH.REVOKE_FROM }}>
        <ListItemSpender data={item} />
      </div>
      <div style={{ width: CELL_WIDTH.GAS_FEE }} className="text-right">
        <ListItemStatus
          data={item}
          isPaused={isPaused}
          onStillRevoke={() => onStillRevoke(item)}
        />
      </div>
    </div>
  );
};
