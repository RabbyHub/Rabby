import { Button } from 'antd';
import React from 'react';
import { ReactComponent as IconInfo } from '@/ui/assets/add-chain/info.svg';
import { useApproval, useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { Footer } from './style';
import { AddEthereumChainParams } from './type';
import IconUnknown from '@/ui/assets/token-default.svg';
import clsx from 'clsx';
import { useAccount } from '@/ui/store-hooks';
import { NoActionBody } from '../NoActionAlert/NoActionBody';

interface Props {
  data: AddEthereumChainParams;
}

export const UnsupportedAlert: React.FC<Props> = ({ data }) => {
  const [, , rejectApproval] = useApproval();
  const { t } = useTranslation();
  const [imgUrl, setImgUrl] = React.useState<string>(data.rpcUrls?.[0]);
  const [isRequested, setIsRequested] = React.useState<boolean>(false);
  const wallet = useWallet();
  const [currentAccount] = useAccount();
  const [requestedCount, setRequestedCount] = React.useState<number>(1);
  const [isRequesting, setIsRequesting] = React.useState<boolean>(false);

  React.useEffect(() => {
    const img = new Image();
    img.src = data.rpcUrls?.[0];
    img.onload = () => {
      setImgUrl(data.rpcUrls[0]);
    };
    img.onerror = () => {
      setImgUrl(IconUnknown);
    };
  }, [data]);

  const handleRequest = React.useCallback(() => {
    setIsRequesting(true);
    wallet.openapi
      .walletSupportChain({
        chain_id: data.chainId,
        user_addr: currentAccount!.address,
      })
      .then((res) => {
        setRequestedCount(res.count ? res.count : 1);
        setIsRequested(true);
      });
  }, [data, currentAccount]);

  return (
    <div>
      <div className="flex-1 px-20 pt-[52px] pb-[46px] text-center">
        <h1 className="text-20 font-medium text-r-neutral-title-1">
          <span>{t('page.switchChain.chainId')}</span>
          <span>{data.chainId}</span>
        </h1>
        <div
          className={clsx(
            'gap-6 mt-16 text-15 text-r-neutral-body',
            'flex items-center justify-center'
          )}
        >
          <img className="w-16 h-16 rounded-full" src={imgUrl} />
          <span>{data.chainName ?? t('page.switchChain.unknownChain')}</span>
        </div>
        <div
          className={clsx(
            'text-13 w-[360px] mx-auto font-medium text-center',
            'bg-r-neutral-card-2 rounded-[6px]',
            'py-12 px-8 mt-40'
          )}
        >
          <div
            className={clsx(
              'text-r-neutral-title-1 gap-x-4',
              'flex items-center'
            )}
          >
            <IconInfo className="w-14" />
            <span>{t('page.switchChain.chainNotSupportYet')}</span>
          </div>
          <NoActionBody
            requestedCount={requestedCount}
            handleRequest={handleRequest}
            isRequested={isRequested}
            isRequesting={isRequesting}
          />
        </div>
      </div>
      <Footer className="justify-center">
        <Button
          type="primary"
          size="large"
          className="w-[200px]"
          onClick={() => rejectApproval()}
        >
          {t('global.ok')}
        </Button>
      </Footer>
    </div>
  );
};
