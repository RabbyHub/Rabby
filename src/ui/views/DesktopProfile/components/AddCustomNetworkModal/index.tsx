import { Modal, ModalProps } from 'antd';
import React from 'react';
import { CustomTestnet } from '@/ui/views/CustomTestnet';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { ReactComponent as RcIconClose } from '@/ui/assets/dapp-search/cc-close.svg';

export const AddCustomNetworkModal: React.FC<
  ModalProps & { onChange?(): void }
> = (props) => {
  const { onChange, ...rest } = props;
  return (
    <Modal
      {...props}
      width={400}
      title={null}
      centered
      bodyStyle={{ background: 'transparent', maxHeight: 'unset', padding: 0 }}
      footer={null}
      className="modal-support-darkmode"
      zIndex={1000}
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      closeIcon={
        <div className="pt-[10px]">
          <RcIconClose
            viewBox="0 0 14 14"
            className="h-[20px] w-[20px] text-r-neutral-title1"
          />
        </div>
      }
      destroyOnClose
    >
      <PopupContainer>
        <CustomTestnet inModal onChange={onChange} />
      </PopupContainer>
    </Modal>
  );
};
