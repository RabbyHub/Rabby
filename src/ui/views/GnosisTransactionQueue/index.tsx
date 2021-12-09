import React, { useEffect, useState } from 'react';
import Safe from '@rabby-wallet/gnosis-sdk';
import { SafeTransactionItem } from '@rabby-wallet/gnosis-sdk/dist/api';
import { useWallet } from 'ui/utils';

const GnosisTransactionQueue = () => {
  const wallet = useWallet();

  const [transactions, setTransactions] = useState<SafeTransactionItem[]>([]);

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    const network = await wallet.getGnosisNetworkId(account.address);
    const { results } = await Safe.getPendingTransactions(
      account.address,
      network
    );
    console.log(results);
    setTransactions(results);
  };

  useEffect(() => {
    init();
  }, []);

  return <div></div>;
};

export default GnosisTransactionQueue;
