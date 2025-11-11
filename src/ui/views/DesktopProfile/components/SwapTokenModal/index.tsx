import { Modal, ModalProps } from 'antd';
import React, { useState, useEffect } from 'react';
import Swap from '../../../Swap';
import { Bridge } from '../../../Bridge';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ModalCloseIcon } from '../TokenDetailModal';
import { useHistory } from 'react-router-dom';

export const SwapTokenModal: React.FC<
  ModalProps & { action: 'swap' | 'bridge' }
> = (props) => {
  const { t } = useTranslation();
  const { action, ...modalProps } = props;
  const history = useHistory();

  const tabs = [
    { key: 'swap' as const, label: t('page.swap.title') },
    { key: 'bridge' as const, label: t('page.bridge.title') },
  ];

  const handleTabChange = (key: 'swap' | 'bridge') => {
    const searchParams = new URLSearchParams(history.location.search);
    searchParams.set('action', key);
    history.replace(`/desktop/profile?${searchParams.toString()}`);
  };

  return (
    <Modal
      {...modalProps}
      className="desktop-swap-token-modal modal-support-darkmode"
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      maskClosable={true}
      centered
      footer={null}
      zIndex={1000}
      closeIcon={ModalCloseIcon}
      destroyOnClose
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className="js-rabby-desktop-swap-container bg-r-neutral-bg-2 rounded-[20px]">
        <div className="flex justify-center mt-12 mb-12 ">
          <div className="inline-flex items-center bg-r-neutral-line rounded-[6px] border border-rabby-neutral-line">
            {tabs.map((tab) => {
              const isActive = tab.key === action;
              return (
                <div
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={clsx(
                    'cursor-pointer rounded-[6px]',
                    'px-[28px] py-[8px] text-center',
                    'text-15 font-medium',
                    isActive
                      ? 'bg-r-neutral-card-1 text-r-blue-default shadow-sm'
                      : 'text-r-neutral-body hover:text-r-blue-default'
                  )}
                >
                  {tab.label}
                </div>
              );
            })}
          </div>
        </div>
        {action === 'swap' ? <Swap /> : <Bridge />}
      </div>
    </Modal>
  );
};
