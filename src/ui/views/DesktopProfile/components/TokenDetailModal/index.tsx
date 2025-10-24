import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import TokenDetail from '../../../Dashboard/components/TokenDetailPopup/TokenDetail';
import { TokenItem } from '@/background/service/openapi';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
interface TokenDetailModalProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
}

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
      maskClosable={false}
      footer={null}
      zIndex={1000}
      maskStyle={{ zIndex: 1000 }}
      destroyOnClose
    >
      {visible && token && (
        <PopupContainer className="h-[600px]">
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
