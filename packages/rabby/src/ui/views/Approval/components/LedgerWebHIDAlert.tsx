import React, { useEffect, useState } from 'react';
import { useApproval } from 'ui/utils/hooks';
import { openInternalPageInTab, useWallet } from 'ui/utils';

const LedgerWebHIDAlert = ({ connected }) => {
  const [hasLedgerHIDPermission, setHasLedgerHIDPermission] = useState<
    null | boolean
  >(false);
  const [_, __, rejectApproval] = useApproval();
  const wallet = useWallet();

  const handleClick = async () => {
    await rejectApproval('User rejected the request.', true);
    openInternalPageInTab('request-permission?type=ledger&from=approval');
  };

  const init = async () => {
    const hasPermission = await wallet.checkLedgerHasHIDPermission();
    setHasLedgerHIDPermission(hasPermission === false ? false : true);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="ledger-webhid-alert">
      {!hasLedgerHIDPermission && (
        <>
          <p>
            In the latest version update, we changed the connection method of
            Ledger to HID.
          </p>
          <p>
            To continue, please{' '}
            <a
              href="javascript:;"
              className="underline font-bold"
              onClick={handleClick}
            >
              allow Rabby permission to use HID
            </a>
          </p>
        </>
      )}
      {hasLedgerHIDPermission && !connected && (
        <p>
          Hardware wallet not connected. Please connect your Ledger to continue.
        </p>
      )}
    </div>
  );
};

export default LedgerWebHIDAlert;
