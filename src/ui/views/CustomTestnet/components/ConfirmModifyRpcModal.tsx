import { TestnetChain } from '@/background/service/customTestnet';
import { findChain } from '@/utils/chain';
import { Button, Modal } from 'antd';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export const ConfirmModifyRpcModal = ({
  visible,
  onCancel,
  onConfirm,
  zIndex,
  chainId,
  rpcUrl,
}: {
  visible: boolean;
  onCancel(): void;
  onConfirm(): void;
  zIndex?: number;
  chainId?: number;
  rpcUrl?: string;
}) => {
  const { t } = useTranslation();
  const chain = useMemo(() => {
    if (!chainId) {
      return null;
    }
    return findChain({
      id: chainId,
    });
  }, [chainId]);
  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      bodyStyle={{
        padding: 0,
        background: 'var(--r-neutral-bg1, #FFF)',
      }}
      zIndex={zIndex || 1002}
      style={{
        zIndex: zIndex || 1002,
      }}
      width={360}
      footer={null}
      closable={false}
      centered
    >
      <div>
        <div className="pt-[30px] px-[12px]">
          <div className="text-r-neutral-title-1 text-[16px] font-medium leading-[20px] text-center">
            {t('page.customTestnet.ConfirmModifyRpcModal.desc')}
          </div>
          <div className="pt-[22px] pb-[25px] flex flex-col items-center">
            <img
              src={chain?.logo}
              alt=""
              className="w-[32px] h-[32px] mb-[8px]"
            />
            <div className="text-[15px] font-medium leading-[18px] text-r-neutral-title-1 mb-[8px]">
              {chain?.name}
            </div>
            <div className="text-r-neutral-body text-[15px] w-full text-center">
              {rpcUrl}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[12px] p-[20px]">
          <Button
            type="primary"
            size="large"
            className="rabby-btn-ghost w-[172px]"
            ghost
            onClick={onCancel}
          >
            {t('global.Cancel')}
          </Button>
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={onConfirm}
          >
            {t('global.Confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
