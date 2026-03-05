import React from 'react';
import clsx from 'clsx';
import { Skeleton } from 'antd';
import { useAsync } from 'react-use';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { getHealthStatusColor } from '@/ui/views/DesktopLending/utils';
import { getHealthFactorText } from '@/ui/views/DesktopLending/utils/health';
import { HF_COLOR_GOOD_THRESHOLD } from '@/ui/views/DesktopLending/utils/constant';
import { fetchLendingHealthFactorForDashboard } from '@/ui/views/DesktopLending/hooks';
import { CustomMarket } from '@/ui/views/DesktopLending/config/market';
import { isNumber } from 'lodash';

export const LendingSubContent = () => {
  const wallet = useWallet();
  const [currentAccount] = useSceneAccount({
    scene: 'lending',
  });
  const lendingId = useRabbySelector((s) => s.innerDappFrame.lending);

  const { value: hfRaw, loading } = useAsync(async () => {
    if (lendingId !== 'aave') return '';
    const address = currentAccount?.address;
    if (!address) return '';
    const marketKey =
      (await wallet.getLastSelectedLendingChain()) ||
      CustomMarket.proto_mainnet_v3;
    return fetchLendingHealthFactorForDashboard(
      wallet,
      address,
      marketKey,
      currentAccount
        ? {
            address: currentAccount.address,
            type: currentAccount.type,
            brandName: currentAccount.brandName,
          }
        : undefined
    );
  }, [lendingId, currentAccount?.address]);

  const hfNumber = React.useMemo(() => {
    const num = Number(hfRaw);
    return isNumber(num) ? num : NaN;
  }, [hfRaw]);

  if (lendingId !== 'aave') return null;

  if (loading) {
    return (
      <div className="absolute bottom-[6px] text-[11px] font-medium">
        <Skeleton.Button
          active={true}
          className="h-[10px] block rounded-[2px]"
          style={{ width: 42 }}
        />
      </div>
    );
  }

  // -1/0/空都不展示；仅展示风险区间 (<3)
  if (!hfRaw || hfRaw === '-1' || !Number.isFinite(hfNumber)) return null;
  if (hfNumber >= HF_COLOR_GOOD_THRESHOLD) return null;

  const colorInfo = getHealthStatusColor(hfNumber);

  return (
    <div
      className={clsx(
        'absolute bottom-[6px] text-[11px] leading-[13px] font-medium'
      )}
      style={{ color: colorInfo.color }}
    >
      {getHealthFactorText(hfRaw)}
    </div>
  );
};
