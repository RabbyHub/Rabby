import React, { useEffect, useState } from 'react';
import { useApproval } from 'ui/utils/hooks';
import { openInTab, openInternalPageInTab, useWallet } from 'ui/utils';
import { browser } from 'webextension-polyfill-ts';
import { ReactComponent as DisconnectSVG } from 'ui/assets/disconnect.svg';

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

  const handleReconnect = async () => {
    const { windowId } = await openInTab(
      './index.html#/import/hardware/ledger-connect?reconnect=1',
      false
    );

    if (windowId) {
      browser.windows.update(windowId, {
        focused: true,
      });
    }
  };

  const init = async () => {
    const hasPermission = await wallet.checkLedgerHasHIDPermission();
    setHasLedgerHIDPermission(hasPermission === false ? false : true);
  };

  useEffect(() => {
    init();
  }, []);

  if (hasLedgerHIDPermission && !connected) {
    return (
      <div className="flex -mt-4 mb-20">
        <DisconnectSVG className="flex-shrink-0 mr-8 mt-4" />
        <p className="m-0 leading-tight">
          Unable to connect to Hardware wallet. Please ensure to connect your
          wallet directly to your computer, unlock your Ledger and open the
          Ethereum app. If you still can't proceed, please{' '}
          <a href="#" className="underline" onClick={handleReconnect}>
            try to re-connect
          </a>
          .
        </p>
      </div>
    );
  }

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
            <a href="#" className="underline font-bold" onClick={handleClick}>
              allow Rabby permission to use HID
            </a>
          </p>
        </>
      )}
    </div>
  );
};

export default LedgerWebHIDAlert;
