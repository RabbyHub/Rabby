import React, { useMemo, useEffect, useState } from 'react';
import { ReactComponent as IconRcGasAccount } from '@/ui/assets/gas-account/gas-account-cc.svg';
import { ReactComponent as IconGift } from '@/ui/assets/gift.svg';
import clsx from 'clsx';
import { useGasAccountInfo } from '../hooks';
import { formatTokenAmount } from '@/ui/utils';
import { useRabbySelector } from 'ui/store';
import { useWallet } from 'ui/utils';

const formatUsdValue = (usd: string | number) => {
  const v = Number(usd);
  if (v >= 1000) {
    return `$${formatTokenAmount(Number(v).toFixed(0), 0)}`;
  }
  if (v >= 100) {
    const fixDown = Math.floor(v * 10) / 10;
    return `$${Number(fixDown).toFixed(1)}`;
  }
  const fixDown = Math.floor(v * 100) / 100;
  return `$${Number(fixDown).toFixed(2)}`;
};

export const GasAccountDashBoardHeader: React.FC = () => {
  const { value, loading } = useGasAccountInfo();
  const wallet = useWallet();
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);
  const [hasGiftEligibility, setHasGiftEligibility] = useState(false);

  // 检查gift资格（只从缓存读取，不调用API）
  useEffect(() => {
    const checkGiftEligibilityFromCache = () => {
      if (currentAccount?.address) {
        try {
          // 只从缓存中获取结果，不调用API
          const cache = wallet.getGiftEligibilityCache();
          const cachedResult = cache[currentAccount.address.toLowerCase()];
          setHasGiftEligibility(cachedResult?.isEligible || false);
        } catch (error) {
          console.error('Failed to get gift eligibility from cache:', error);
          setHasGiftEligibility(false);
        }
      }
    };

    checkGiftEligibilityFromCache();
  }, [currentAccount?.address, wallet]);

  const usd = useMemo(() => {
    if (loading) {
      return formatUsdValue(0);
    }
    if (value && 'account' in value) {
      return formatUsdValue(value.account.balance);
    }
  }, [value]);

  return (
    <div
      className={clsx(
        'flex gap-2 items-center justify-center',
        'px-8 py-6 rounded-[4px]',
        'text-13 leading-normal text-light-r-neutral-title-2',
        'text-opacity-60 hover:text-opacity-100',
        'bg-light-r-neutral-title-2 bg-opacity-10 hover:bg-opacity-20'
      )}
    >
      {hasGiftEligibility ? (
        <IconGift viewBox="0 0 16 16" className="w-16 h-16" />
      ) : (
        <IconRcGasAccount viewBox="0 0 16 16" className="w-16 h-16" />
      )}
      <>{usd}</>
    </div>
  );
};
