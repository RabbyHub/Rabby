import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
import { Empty } from '@/ui/component';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { useMemoizedFn, useRequest } from 'ahooks';
import { Modal, ModalProps } from 'antd';
import { last } from 'lodash';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DesktopHistoryItem } from '../DesktopHistoryItem';
import { DesktopLoading } from '../DesktopLoading';
import { useQueryDbHistory } from '@/db/hooks/history';

export const HideScamTransactionModal: React.FC<ModalProps> = (modalProps) => {
  const { t } = useTranslation();

  const wallet = useWallet();
  const currentAccount = useCurrentAccount();

  const { data, isLoading: loading } = useQueryDbHistory({
    address: currentAccount?.address || '',
    isFilterScam: true,
  });

  const isEmpty = (data?.length || 0) <= 0 && !loading;

  return (
    <Modal
      {...modalProps}
      width={1148}
      title={null}
      className="modal-support-darkmode global-desktop-modal"
      bodyStyle={{
        background: 'transparent',
        padding: 0,
        height: '720px',
      }}
      centered
      maskClosable={true}
      footer={null}
      zIndex={1000}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      destroyOnClose
    >
      <header className="text-center py-[15px] sticky top-0 z-10 bg-rb-neutral-bg-1 relative">
        <div className="text-[20px] leading-[24px] font-medium text-rb-neutral-title-1">
          {t('page.transactions.filterScam.title')}
        </div>
        <div className="text-[13px] leading-[16px] text-rb-neutral-foot">
          {t('page.transactions.filterScam.loading')}
        </div>
        <div className="absolute right-[20px] top-0 bottom-0 flex items-center">
          <div onClick={modalProps.onCancel}>
            <RcIconClose
              viewBox="0 0 14 14"
              className="w-[20px] h-[20px] text-r-neutral-foot hover:text-r-neutral-title-1 cursor-pointer"
            />
          </div>
        </div>
      </header>
      <section className="px-[34px] pb-[34px]">
        {loading ? (
          <div className="overflow-hidden">
            <DesktopLoading count={8} active />
          </div>
        ) : (
          <>
            {isEmpty ? (
              <Empty
                title={t('page.transactions.empty.title')}
                className="pt-[108px]"
              />
            ) : (
              <div className="overflow-hidden">
                {data?.map((item) => (
                  <DesktopHistoryItem key={item.id} data={item} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </Modal>
  );
};
