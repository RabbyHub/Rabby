import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { AddCustomTestnetTokenContent } from '@/ui/views/CommonPopup/AssetList/CustomTestnetAssetList/AddCustomTestnetTokenPopup';
import { Modal, ModalProps } from 'antd';
import React from 'react';

export const AddCustomTokenModal: React.FC<
  ModalProps & { onCancel?(): void; onOk?(): void }
> = (props) => {
  return (
    <Modal
      {...props}
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      footer={null}
      zIndex={1000}
      closeIcon={
        <div className="pt-[10px]">
          <RcIconClose
            viewBox="0 0 14 14"
            className="h-[20px] w-[20px] text-r-neutral-title1"
          />
        </div>
      }
      destroyOnClose
      centered
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      <PopupContainer>
        <div className="h-[600px] overflow-auto">
          <div className="text-r-neutral-title1 text-center text-[20px] leading-[24px] font-medium pt-[20px] pb-[16px]">
            Add Custom Network Token
          </div>
          <div className="flex flex-col gap-[12px] px-[20px] flex-1 overflow-auto pb-[12px]">
            <AddCustomTestnetTokenContent
              inModal
              onConfirm={props.onOk}
              onClose={props.onCancel}
            />
          </div>
        </div>
      </PopupContainer>
    </Modal>
  );
};
