import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { AddCustomTestnetTokenContent } from '@/ui/views/CommonPopup/AssetList/CustomTestnetAssetList/AddCustomTestnetTokenPopup';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
import { Modal, ModalProps } from 'antd';
import React from 'react';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { PageHeader } from '@/ui/component';

export const AddCustomTokenModal: React.FC<ModalProps> = (props) => {
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
      destroyOnClose
    >
      <PopupContainer>
        <FullscreenContainer className="h-[700px]">
          <PageHeader
            className="pt-[24px] mx-[20px] mb-16"
            canBack={false}
            closeable={false}
          >
            Add Custom Network Token
          </PageHeader>
          <div className="flex flex-col gap-[12px] px-[20px] flex-1 overflow-auto pb-[12px]">
            <AddCustomTestnetTokenContent inModal />
          </div>
        </FullscreenContainer>
      </PopupContainer>
    </Modal>
  );
};
