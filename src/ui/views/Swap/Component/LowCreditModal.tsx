import React, { useEffect, useState } from 'react';
import { Modal, TokenWithChain } from '@/ui/component';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from '@/ui/utils/token';
import { useTranslation } from 'react-i18next';
import { ellipsisAddress } from '@/ui/utils/address';
import { Button } from 'antd';
import { ReactComponent as RcIconExternalCC } from 'ui/assets/open-external-cc.svg';
import clsx from 'clsx';
import { openInTab, useWallet } from '@/ui/utils';
import { getAddressScanLink } from '@/utils';
import { findChainByServerID } from '@/utils/chain';

export const useLowCreditState = (toToken?: TokenItem) => {
  const wallet = useWallet();
  const [lowCreditToken, setLowCreditToken] = useState<TokenItem>();
  const [lowCreditVisible, setLowCreditVisible] = useState(false);

  useEffect(() => {
    wallet
      .getPageStateCache()
      .then((cache) => {
        if (cache?.states?.showLowCreditModal && toToken) {
          setLowCreditToken(toToken);
          setLowCreditVisible(true);
        }
      })
      .finally(() => {
        wallet.clearPageStateCache();
      });
  }, []);

  return {
    lowCreditToken,
    lowCreditVisible,
    setLowCreditToken,
    setLowCreditVisible,
  };
};

export const LowCreditModal = ({
  className,
  token,
  onCancel,
  visible,
}: {
  visible: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  className?: string;
  token?: TokenItem;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();

  const openTokenAddress = () => {
    if (token) {
      const scanLink = findChainByServerID(token.chain)?.scanLink;
      if (!scanLink) return;

      wallet.setPageStateCache({
        path: '/dex-swap',
        params: {},
        states: {
          showLowCreditModal: true,
        },
      });

      openInTab(getAddressScanLink(scanLink, token?.id));
    }
  };

  if (!token) {
    return null;
  }
  return (
    <Modal
      visible={visible}
      width={320}
      cancelText={null}
      okText={null}
      footer={null}
      onCancel={onCancel}
      closable={false}
      className={clsx('modal-support-darkmode', className)}
      bodyStyle={{
        paddingLeft: 20,
        paddingRight: 20,
      }}
      focusTriggerAfterClose={false}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-center">
          <TokenWithChain token={token} hideConer width="40px" height="40px" />
        </div>
        <div className="mt-8 mb-4 text-18 font-medium text-r-neutral-title-1 text-center">
          {getTokenSymbol(token)}
        </div>
        <div
          role="button"
          className="flex items-center justify-center gap-2 text-14 text-r-neutral-body cursor-pointer"
          onClick={openTokenAddress}
        >
          {ellipsisAddress(token.id)}
          <RcIconExternalCC className="w-14 h-14 text-r-neutral-body" />
        </div>
        <div className="mt-16 mb-12 text-[16px] font-medium text-r-neutral-title1 text-center">
          {t('page.swap.lowCreditModal.title')}
        </div>
        <div className="mb-32 rounded-md p-10 pr-[9px] bg-r-neutral-card2 text-12 text-r-neutral-foot">
          {t('page.swap.lowCreditModal.desc')}
        </div>
        <Button
          type="primary"
          className="mt-auto h-40 text-15 font-medium"
          onClick={onCancel}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </Modal>
  );
};
