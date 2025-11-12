import { Modal, ModalProps } from 'antd';
import React, { useState, useEffect } from 'react';
import Swap from '../../../Swap';
import { Bridge } from '../../../Bridge';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { NFTView } from '@/ui/views/NFTView';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';

export const NftTabModal: React.FC<ModalProps> = (props) => {
  const { t } = useTranslation();

  return (
    <Modal
      {...props}
      className="desktop-swap-token-modal"
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      footer={null}
      zIndex={1000}
      maskStyle={{ zIndex: 1000 }}
      closeIcon={
        <RcIconClose viewBox="0 0 14 14" className="h-[20px] w-[20px]" />
      }
    >
      <PopupContainer className="h-[600px]">
        <NFTView isInModal />
      </PopupContainer>
    </Modal>
  );
};
