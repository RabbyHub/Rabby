import React, { useMemo } from 'react';
import { ReactComponent as IconRcGasAccount } from '@/ui/assets/gas-account/gas-account-cc.svg';
import { ReactComponent as IconGift } from '@/ui/assets/gift-14.svg';
import clsx from 'clsx';
import { useGasAccountInfo } from '../hooks';
import { formatGasAccountUsdValueV2, formatTokenAmount } from '@/ui/utils';
import { useRabbySelector } from 'ui/store';

export const GasAccountDashBoardHeader: React.FC = () => {
  const { value, loading } = useGasAccountInfo();
  const giftUsdValue = useRabbySelector((s) => s.gift.giftUsdValue);
  const hasClaimedGift = useRabbySelector((s) => s.gift.hasClaimedGift);

  // 检查当前账号是否有gift资格
  const hasGiftEligibility = useMemo(() => {
    return giftUsdValue > 0 && !hasClaimedGift;
  }, [giftUsdValue, hasClaimedGift]);

  const usd = useMemo(() => {
    if (loading) {
      return formatGasAccountUsdValueV2(0);
    }
    if (value && 'account' in value) {
      return formatGasAccountUsdValueV2(value.account.balance);
    }
  }, [value]);

  return (
    <div
      className={clsx(
        'flex gap-2 items-center justify-center',
        'px-8 py-6 rounded-[4px]',
        'text-13 leading-normal text-light-r-neutral-title-2',
        hasGiftEligibility
          ? 'bg-green'
          : 'bg-light-r-neutral-title-2 bg-opacity-10 hover:bg-opacity-20'
      )}
    >
      {hasGiftEligibility ? (
        <>
          <IconGift viewBox="0 0 14 14" className="w-14 h-14" />
          {formatGasAccountUsdValueV2(giftUsdValue)}
        </>
      ) : (
        <>
          <IconRcGasAccount viewBox="0 0 16 16" className="w-16 h-16" />
          {usd}
        </>
      )}
    </div>
  );
};
