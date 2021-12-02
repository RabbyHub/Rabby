import React, { useEffect, useState } from 'react';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/src/api';
import { Account } from 'background/service/preference';
import { useWallet } from 'ui/utils';

interface GnosisDrawer {
  safeInfo: SafeInfo;
}
interface Signature {
  data: string;
  signer: string;
}

const GnosisDrawer = ({ safeInfo }: GnosisDrawer) => {
  const wallet = useWallet();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [visibleAccounts, setVisibleAccounts] = useState<Account[]>([]);

  const init = async () => {
    const sigs = await wallet.getGnosisTransactionSignatures();
    const accounts = await wallet.getAllVisibleAccountsArray();
    setSignatures(sigs);
    setVisibleAccounts(accounts);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="gnosis-drawer-container">
      <div className="title">
        {safeInfo.threshold - signatures.length} more confirmation needed
      </div>
      <div className="list"></div>
    </div>
  );
};

export default GnosisDrawer;
