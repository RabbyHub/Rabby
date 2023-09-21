import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconAlert from '@/ui/assets/sign/tx/alert.svg';
import React from 'react';
import clsx from 'clsx';
import { ReactComponent as IconEmail } from '@/ui/assets/add-chain/email.svg';
import { useAccount } from '@/ui/store-hooks';
import { noop, useWallet } from '@/ui/utils';

const NoActionAlertStyled = styled.div`
  display: flex;
  align-items: center;
  flex-direction: column;
  background: var(--r-neutral-card-1);
  border-radius: 6px;
  padding: 15px;
  font-weight: 500;
  font-size: 13px;
  line-height: 18px;
  color: var(--r-neutral-body);
  margin-bottom: 15px;
  .icon-alert {
    margin-right: 4px;
    width: 14px;
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
        <img src={IconAlert} className="icon icon-alert" />
        {t('page.signTx.sigCantDecode')}
      </div>
      <div className="h-1 bg-r-neutral-line w-full my-12" />
      <div className="leading-[16px]">
        {isRequested ? (
          <div className="text-r-neutral-foot">
            {requestedCount > 1
              ? t('page.switchChain.requestsReceivedPlural', {
                  count: requestedCount,
                })
              : t('page.switchChain.requestsReceived')}
          </div>
        ) : (
          <div
            className={clsx(
              'gap-x-6 flex items-center justify-center',
              'cursor-pointer hover:opacity-70'
            )}
            onClick={isRequesting ? noop : handleRequest}
          >
            <IconEmail className="w-16" />
            <span className="text-r-blue-default">
              {t('page.switchChain.requestRabbyToSupport')}
            </span>
          </div>
        )}
      </div>
    </NoActionAlertStyled>
  );
};
