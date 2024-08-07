import React from 'react';
import { AssetApprovalSpenderWithStatus } from './useBatchRevokeTask';
import { formatGasCostUsd, formatTokenAmount } from '@/ui/utils';
import { findChainByServerID } from '@/utils/chain';
import { Chain } from '@debank/common';
import clsx from 'clsx';

interface Props {
  record: AssetApprovalSpenderWithStatus;
}

export const GasRow: React.FC<Props> = ({ record }) => {
  if (record.$status?.status === 'fail') {
    return null;
  }

  if (!record.$status || record.$status.status === 'pending') {
    return <div>-</div>;
  }

  const gasCost = record.$status.gasCost;

  const chainItem = findChainByServerID(
    record.$assetParent?.chain as Chain['serverId']
  );
  if (!chainItem?.enum) return <div>-</div>;

  const gasCostUsdStr = React.useMemo(() => {
    const bn = gasCost.gasCostUsd!;

    return `$${formatGasCostUsd(bn)}`;
  }, [gasCost.gasCostUsd]);

  const gasCostAmountStr = React.useMemo(() => {
    return `${formatTokenAmount(gasCost.gasCostAmount.toString(10), 6)} ${
      chainItem.nativeTokenSymbol
    }`;
  }, [gasCost.gasCostAmount]);

  return (
    <div className="flex overflow-hidden">
      <span className="text-r-neutral-title1 font-medium text-14">
        {gasCostUsdStr}
      </span>
      <span
        className={clsx(
          'text-r-neutral-foot text-14 ml-6 font-normal',
          'truncate'
        )}
      >
        ({gasCostAmountStr})
      </span>
    </div>
  );
};
