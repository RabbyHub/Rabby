import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import TokenDetail from '../../../Dashboard/components/TokenDetailPopup/TokenDetail';
import { TokenItem } from '@/background/service/openapi';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { SvgIconCross } from 'ui/assets';
interface TokenDetailModalProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
}
export const ModalCloseIcon = (
  <SvgIconCross className="w-14 fill-current text-gray-content" />
);

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({
  token,
  visible,
  onClose,
  canClickToken = true,
  hideOperationButtons = false,
}) => {
  const account = useCurrentAccount();

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={400}
      title={null}
      bodyStyle={{ background: 'transparent', maxHeight: '600px', padding: 0 }}
      maskClosable={true}
      footer={null}
      zIndex={1000}
      className="modal-support-darkmode"
      closeIcon={ModalCloseIcon}
      centered
      maskStyle={{
        zIndex: 1000,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
    >
      {visible && token && (
        <PopupContainer className="h-[600px] bg-r-neutral-bg-2">
          <TokenDetail
            account={account || undefined}
            token={token}
            popupHeight={540}
            onClose={onClose}
            canClickToken={canClickToken}
            hideOperationButtons={hideOperationButtons}
          />
        </PopupContainer>
      )}
    </Modal>
  );
};
