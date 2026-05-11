import { Modal } from 'antd';
import React from 'react';
import TokenDetail from '../../../Dashboard/components/TokenDetailPopup/TokenDetail';
import { TokenItem } from '@/background/service/openapi';
import { Token } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { SvgIconCross } from 'ui/assets';
import { isSameAddress, useWallet } from '@/ui/utils';
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
  const wallet = useWallet();
  const [isAdded, setIsAdded] = React.useState(false);

  const checkIsAdded = React.useCallback(async () => {
    if (!token) return;

    let list: Token[] = [];
    if (token.is_core) {
      list = await wallet.getBlockedToken();
    } else {
      list = await wallet.getCustomizedToken();
    }

    const isAdded = list.some(
      (item) =>
        isSameAddress(item.address, token.id) && item.chain === token.chain
    );
    setIsAdded(isAdded);
  }, [token]);

  React.useEffect(() => {
    checkIsAdded();
  }, [checkIsAdded]);

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      width={403}
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
      destroyOnClose
    >
      {visible && token && (
        <PopupContainer className="h-[600px] bg-r-neutral-bg-2">
          <TokenDetail
            account={account || undefined}
            variant="add"
            isAdded={isAdded}
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
