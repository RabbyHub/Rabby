import React, { useEffect, useState } from 'react';
import { Account } from 'background/service/preference';
import { ScanCopyQRCode } from 'ui/component';
import { useCommonPopupView } from 'ui/utils';

const Scan = ({
  uri,
  onRefresh,
  bridgeURL,
  onBridgeChange,
  defaultBridge,
  account,
}: {
  uri: string;
  bridgeURL: string;
  defaultBridge: string;
  account: Account;
  onRefresh(): void;
  onBridgeChange(val: string): void;
}) => {
  const [showURL, setShowURL] = useState(false);
  const [brandName, setBrandName] = useState<string | null>(null);
  const handleRefresh = () => {
    onRefresh();
  };
  const { setHeight, setClassName } = useCommonPopupView();

  const init = async () => {
    setBrandName(account.brandName);
    setHeight(420);
    setClassName('isConnectView');
  };

  useEffect(() => {
    init();
  }, []);
  return (
    <div className="watchaddress-scan">
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={uri || ''}
        refreshFun={handleRefresh}
        onBridgeChange={onBridgeChange}
        bridgeURL={bridgeURL}
        defaultBridge={defaultBridge}
        canChangeBridge={false}
        brandName={brandName!}
        account={account}
      />
    </div>
  );
};

export default Scan;
