import { createTestnetChain } from '@/background/service/customTestnet';
import IconUnknown from '@/ui/assets/token-default.svg';
import { useApproval, useWallet } from '@/ui/utils';
import { EditCustomTestnetModal } from '@/ui/views/CustomTestnet/components/EditTestnetModal';
import { useRequest } from 'ahooks';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Footer } from './style';
import { AddEthereumChainParams } from './type';
import BigNumber from 'bignumber.js';

interface Props {
  data: AddEthereumChainParams;
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

export const UnsupportedAlert: React.FC<Props> = ({ data, session }) => {
  const [, resolveApproval] = useApproval();
  const { t } = useTranslation();
  const [imgUrl, setImgUrl] = React.useState<string>(data.rpcUrls?.[0]);
  const wallet = useWallet();
  const [isShowAddModal, setIsShowAddModal] = React.useState<boolean>(false);

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

  const { data: chainInfo } = useRequest(
    async () => {
      if (data?.chainId) {
        const res = await wallet.openapi.getChainListByIds({
          ids: new BigNumber(data.chainId).toString(),
        });

        const item = res?.[0];
        if (!item) {
          return;
        }

        return createTestnetChain({
          name: item.name,
          id: item.chain_id,
          nativeTokenSymbol: item.native_currency.symbol,
          rpcUrl: item.rpc || '',
          scanLink: item.explorer || '',
        });
      }
    },
    {
      refreshDeps: [data?.chainId],
    }
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 px-20 pt-[52px] pb-[46px] text-center overflow-auto">
        <h1 className="text-20 font-medium text-r-neutral-title-1">
          <span>{t('page.switchChain.chainId')}</span>
          <span>{+data.chainId}</span>
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
            'bg-r-neutral-card-2 rounded-[6px] text-r-neutral-title1',
            'py-[12px] px-[18px] mt-[40px]'
          )}
        >
          <div
            className={clsx(
              'text-r-neutral-title-1 gap-x-4',
              'flex items-center'
            )}
          >
            <span>{t('page.switchChain.chainNotSupportAddChain')}</span>
          </div>
        </div>
      </div>
      <Footer className="justify-center">
        <Button
          type="primary"
          size="large"
          block
          // onClick={() => rejectApproval()}
          onClick={() => {
            setIsShowAddModal(true);
            wallet.updateNotificationWinProps({
              height: 720,
            });
          }}
        >
          {t('page.switchChain.addChain')}
        </Button>
      </Footer>

      <EditCustomTestnetModal
        visible={isShowAddModal}
        data={chainInfo}
        height={600}
        onCancel={() => setIsShowAddModal(false)}
        onConfirm={async (res) => {
          setIsShowAddModal(false);
          const site = await wallet.getConnectedSite(session.origin)!;
          if (site) {
            await wallet.updateConnectSite(site?.origin, {
              ...site,
              chain: res.enum,
            });
          }
          resolveApproval();
        }}
      />
    </div>
  );
};
