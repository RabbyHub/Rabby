import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconAlert } from '@/ui/assets/sign/tx/alert-currentcolor.svg';
import React from 'react';
import { useAccount } from '@/ui/store-hooks';
import { useWallet } from '@/ui/utils';
import { NoActionBody } from './NoActionBody';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const NoActionAlertStyled = styled.div`
  display: flex;
  flex-direction: column;
  background: var(--r-neutral-card-1);
  border-radius: 6px;
  padding: 15px;
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: var(--r-neutral-body);
  width: 360px;
  .icon-alert {
    margin-right: 4px;
    width: 15px;
    margin-top: 2px;
  }
`;

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
}

export const NoActionAlert: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  const [isRequested, setIsRequested] = React.useState<boolean>(false);
  const wallet = useWallet();
  const [currentAccount] = useAccount();
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
  }, [data, currentAccount]);

  return (
    <NoActionAlertStyled>
      <div className="flex items-start">
        {/* <img src={IconAlert} className="icon icon-alert" /> */}
        <ThemeIcon
          src={RcIconAlert}
          className="icon icon-alert text-r-neutral-body"
        />
        {t('page.signTx.sigCantDecode')}
      </div>
      <NoActionBody
        requestedCount={requestedCount}
        handleRequest={handleRequest}
        isRequested={isRequested}
        isRequesting={isRequesting}
      />
    </NoActionAlertStyled>
  );
};
