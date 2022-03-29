import React from 'react';
import { useApproval } from 'ui/utils/hooks';
import { openInternalPageInTab } from 'ui/utils';

const LedgerWebHIDAlert = () => {
  const [_, __, rejectApproval] = useApproval();

  const handleClick = async () => {
    await rejectApproval('User rejected the request.', true);
    openInternalPageInTab('request-permission?type=ledger&from=approval');
  };

  return (
    <div className="ledger-webhid-alert">
      <p>
        In the latest version update, we changed the connection method of Ledger
        to HID.
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
    </div>
  );
};

export default LedgerWebHIDAlert;
