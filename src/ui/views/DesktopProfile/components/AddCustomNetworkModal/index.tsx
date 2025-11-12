import { Modal, ModalProps } from 'antd';
import React from 'react';
import { CustomTestnet } from '@/ui/views/CustomTestnet';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';

export const AddCustomNetworkModal: React.FC<ModalProps> = (props) => {
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
      // closeIcon={
      //   <RcIconClose viewBox="0 0 14 14" className="h-[20px] w-[20px]" />
      // }
      destroyOnClose
    >
      <PopupContainer>
        <CustomTestnet inModal />
      </PopupContainer>
    </Modal>
  );
};
