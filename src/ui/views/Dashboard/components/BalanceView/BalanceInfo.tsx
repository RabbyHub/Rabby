import useCurrentBalance from '@/ui/hooks/useCurrentBalance';
import { useRabbySelector } from '@/ui/store';
import { Skeleton } from 'antd';
import React, { useState } from 'react';
import { BalanceLabel } from './BalanceLabel';
import { useCurve } from './useCurve';

function BalanceInfo({ currentAccount, accountBalanceUpdateNonce = 0 }) {
  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );
  const [startRefresh, setStartRefresh] = useState(false);
  const [
    balance,
    matteredChainBalances,
    _,
    success,
    balanceLoading,
    balanceFromCache,
    refreshBalance,
    hasValueChainBalances,
    testnetBalance,
    testnetMatteredChainBalances,
    _1,
    testnetSuccess,
    testnetBalanceLoading,
    _2,
    hasTestnetValueChainBalances,
  ] = useCurrentBalance(
    currentAccount?.address,
    true,
    false,
    accountBalanceUpdateNonce,
    isShowTestnet
  );
  const {
    result: curveData,
    refresh: refreshCurve,
    isLoading: curveLoading,
  } = useCurve(currentAccount?.address, accountBalanceUpdateNonce, balance);

  const onRefresh = async () => {
    setStartRefresh(true);
    try {
      await Promise.all([refreshBalance(), refreshCurve()]);
    } catch (e) {
      console.error(e);
    } finally {
      setStartRefresh(false);
    }
  };

  const currentBalance = balance;

  return (
    <div onClick={onRefresh}>
      {startRefresh ||
      (balanceLoading && !balanceFromCache) ||
      currentBalance === null ||
      (balanceFromCache && currentBalance === 0) ? (
        <div />
      ) : (
        <BalanceLabel isCache={balanceFromCache} balance={currentBalance} />
      )}
    </div>
  );
}

export default BalanceInfo;
