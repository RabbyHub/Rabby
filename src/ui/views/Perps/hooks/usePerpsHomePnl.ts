import { useEffect, useMemo, useState } from 'react';
import {
  canCachePerpsHomeBalance,
  PerpsHomeAccount,
  PerpsHomeAmount,
} from '@/db/schema/perpsHomeBalance';
import type { PerpsState } from '@/ui/state/perps';
import { useRabbySelector } from '@/ui/store';
import { useWallet } from '@/ui/utils';
import type { AggregatedClearinghouseState } from '../../DesktopPerps/utils';
import { usePerpsClearHouseState } from './usePerpsClearingHouseState';
import { usePerpsAccount } from './usePerpsAccount';

export type PerpsHomeBalanceStatus = 'blank' | 'loading' | 'ready';

const parseFinite = (raw?: string) => {
  const trimmed = raw?.trim();
  return trimmed ? Number(trimmed) : NaN;
};

function resolveLiveAmount(params: {
  data: AggregatedClearinghouseState | null;
  modeStatus: PerpsState['userAbstractionStatus'];
  availableBalance: number;
  isAvailableBalanceReady: boolean;
  isSpotCollateralMode: boolean;
}): { amount: PerpsHomeAmount | null; waiting: boolean } {
  const {
    data,
    modeStatus,
    availableBalance,
    isAvailableBalanceReady,
    isSpotCollateralMode,
  } = params;
  if (!data) return { amount: null, waiting: false };

  if (data.assetPositions.length > 0) {
    const value = data.assetPositions.reduce(
      (sum, item) => sum + parseFinite(item.position.unrealizedPnl),
      0
    );
    return {
      amount: Number.isFinite(value) ? { kind: 'pnl', value } : null,
      waiting: false,
    };
  }

  if (modeStatus !== 'ready') {
    return { amount: null, waiting: modeStatus !== 'error' };
  }

  // Spot-collateral accounts need their own spot snapshot. Perps-side
  // withdrawable can be zero even when the available balance is not.
  if (!isAvailableBalanceReady && isSpotCollateralMode) {
    return { amount: null, waiting: true };
  }

  const value = isAvailableBalanceReady
    ? availableBalance
    : parseFinite(data.withdrawable);
  return {
    amount: Number.isFinite(value) ? { kind: 'availableBalance', value } : null,
    waiting: false,
  };
}

export const usePerpsHomePnl = (): {
  status: PerpsHomeBalanceStatus;
  amount: PerpsHomeAmount | null;
} => {
  const wallet = useWallet();
  const currentAccount = useRabbySelector((s) => s.perps.currentPerpsAccount);
  const modeStatus = useRabbySelector((s) => s.perps.userAbstractionStatus);
  const address = currentAccount?.address?.toLowerCase() || '';
  const type = currentAccount?.type || '';
  const account = useMemo<PerpsHomeAccount>(() => ({ address, type }), [
    address,
    type,
  ]);
  const cacheable = useMemo(() => canCachePerpsHomeBalance(account), [account]);

  const { runAsync: refreshPositions } = usePerpsClearHouseState({
    ...account,
    manual: true,
  });
  const {
    availableBalance,
    isAvailableBalanceReady,
    isUnifiedAccount,
    isPortfolioMargin,
  } = usePerpsAccount();

  const [cached, setCached] = useState<{
    account: PerpsHomeAccount;
    amount: PerpsHomeAmount | null;
  }>();
  const [positions, setPositions] = useState<{
    account: PerpsHomeAccount;
    data: AggregatedClearinghouseState | null;
  }>();

  useEffect(() => {
    if (!address) return;
    let active = true;
    refreshPositions()
      .catch(() => null)
      .then((data) => {
        if (active) setPositions({ account, data });
      });
    if (cacheable) {
      wallet
        .getPerpsHomeBalance(account)
        .catch(() => null)
        .then((amount) => {
          if (active) setCached({ account, amount });
        });
    }
    return () => {
      active = false;
    };
  }, [wallet, account, address, cacheable, refreshPositions]);

  const receivedPositions = positions?.account === account;
  const positionsData = receivedPositions ? positions.data : null;
  const { amount: live, waiting } = useMemo(
    () =>
      resolveLiveAmount({
        data: positionsData,
        modeStatus,
        availableBalance,
        isAvailableBalanceReady,
        isSpotCollateralMode: isUnifiedAccount || isPortfolioMargin,
      }),
    [
      positionsData,
      modeStatus,
      availableBalance,
      isAvailableBalanceReady,
      isUnifiedAccount,
      isPortfolioMargin,
    ]
  );

  const liveKind = live?.kind;
  const liveValue = live?.value;
  useEffect(() => {
    if (!cacheable || liveKind === undefined || liveValue === undefined) return;
    wallet
      .setPerpsHomeBalance(account, { kind: liveKind, value: liveValue })
      .catch(console.error);
  }, [wallet, account, cacheable, liveKind, liveValue]);

  return useMemo(() => {
    const cachedReady = cached?.account === account;
    const amount = address
      ? live ?? (cachedReady ? cached.amount : null)
      : null;
    const readingCache = cacheable && !cachedReady;

    let status: PerpsHomeBalanceStatus = 'ready';
    if (!address || (readingCache && !amount)) {
      status = 'blank';
    } else if (!amount && (!receivedPositions || waiting)) {
      status = 'loading';
    }

    return { status, amount };
  }, [address, account, cacheable, cached, live, receivedPositions, waiting]);
};
