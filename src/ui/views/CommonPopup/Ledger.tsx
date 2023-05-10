import {
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
} from '@/ui/utils';
import { useLedgerDeviceConnected } from '@/utils/ledger';
import React from 'react';

export const Ledger: React.FC = () => {
  const { setTitle, setHeight, closePopup } = useCommonPopupView();
  const [_, __, rejectApproval] = useApproval();
  const hasConnectedLedgerHID = useLedgerDeviceConnected();

  React.useEffect(() => {
    setTitle('How to Connect Ledger');
    setHeight(360);
  }, []);

  React.useEffect(() => {
    if (hasConnectedLedgerHID) {
      closePopup();
    }
  }, [hasConnectedLedgerHID]);

  const handleClick = async () => {
    await rejectApproval('User rejected the request.', true);
    openInternalPageInTab('request-permission?type=ledger&from=approval');
  };

  return (
    <div className="pt-[10px]">
      <ul className="list-decimal w-[180px] pl-[20px] m-auto text-gray-title text-14 leading-[20px]">
        <li>Plug in a single Ledger</li>
        <li>Enter pin to unlock</li>
        <li>Open Ethereum App</li>
      </ul>
      <img
        src="/images/ledger-plug.png"
        className="w-[240px] bg-gray-bg mt-[20px] mx-auto py-20 px-40"
      />
      <div className="mt-[46px] text-13 text-gray-subTitle">
        If it doesn't work, please try{' '}
        <span className="underline cursor-pointer" onClick={handleClick}>
          reconnecting from the beginning.
        </span>
      </div>
    </div>
  );
};
