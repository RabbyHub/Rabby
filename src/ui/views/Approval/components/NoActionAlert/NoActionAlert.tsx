import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconAlert } from '@/ui/assets/sign/tx/alert-currentcolor.svg';
import React from 'react';
import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { NoActionBody } from './NoActionBody';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { Account } from '@/background/service/preference';

type SupportOrigin = {
  origin: string;
  text: string;
};

type SupportSelector = {
  chainId: string;
  contractAddress?: string;
  selector?: string;
};

interface Props {
  data: SupportOrigin | SupportSelector;
  account: Account;
}

export const NoActionAlert: React.FC<Props> = ({
  data,
  account: currentAccount,
}) => {
  const { t } = useTranslation();
  const [isRequested, setIsRequested] = React.useState<boolean>(false);
  const wallet = useWallet();
  const [requestedCount, setRequestedCount] = React.useState<number>(1);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  const handleRequest = React.useCallback(() => {
    setIsRequesting(true);
    let promise;
    if ('origin' in data) {
      promise = wallet.openapi.walletSupportOrigin({
        origin: data.origin,
        user_addr: currentAccount!.address,
        text: data.text,
      });
    } else {
      promise = wallet.openapi.walletSupportSelector({
        chain_id: data.chainId,
        contract_id: data.contractAddress ?? '',
        selector: (data.selector ?? '').slice(0, 10),
        user_addr: currentAccount!.address,
      });
    }

    promise.then((res) => {
      setRequestedCount(res.count ? res.count : 1);
      setIsRequested(true);
    });
  }, [data, currentAccount, wallet.openapi]);

  return (
    <div className="flex flex-col bg-r-neutral-card-1 rounded-[6px] p-[15px] font-medium text-13 leading-[18px] text-r-neutral-body w-[360px]">
      <div className="flex items-start">
        {/* <img src={IconAlert} className="icon icon-alert" /> */}
        <ThemeIcon
          src={RcIconAlert}
          className="icon icon-alert text-r-neutral-body mr-4 w-[15px] mt-2"
        />
        {t('page.signTx.sigCantDecode')}
      </div>
      <NoActionBody
        requestedCount={requestedCount}
        handleRequest={handleRequest}
        isRequested={isRequested}
        isRequesting={isRequesting}
      />
    </div>
  );
};
