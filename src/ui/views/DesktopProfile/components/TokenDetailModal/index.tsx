import { Modal, ModalProps } from 'antd';
import React, { useMemo } from 'react';
import TokenDetail from '../../../Dashboard/components/TokenDetailPopup/TokenDetail';
import { TokenItem } from '@/background/service/openapi';
import { Account, Token } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { SvgIconCross } from 'ui/assets';
import { isSameAddress, useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';
import { DisplayedToken } from '@/ui/utils/portfolio/project';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
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
  const dispatch = useRabbyDispatch();
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAddToken = React.useCallback((tokenWithAmount) => {
    if (!tokenWithAmount) return;

    if (tokenWithAmount.is_core) {
      dispatch.account.addBlockedToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    } else {
      dispatch.account.addCustomizeToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    }
    setIsAdded(true);
  }, []);

  const handleRemoveToken = React.useCallback((tokenWithAmount) => {
    if (!tokenWithAmount) return;

    if (tokenWithAmount?.is_core) {
      dispatch.account.removeBlockedToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    } else {
      dispatch.account.removeCustomizeToken(
        new DisplayedToken(tokenWithAmount) as AbstractPortfolioToken
      );
    }
    setIsAdded(false);
  }, []);

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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}
    >
      {visible && token && (
        <PopupContainer className="h-[600px] bg-r-neutral-bg-2">
          <TokenDetail
            account={account || undefined}
            addToken={handleAddToken}
            removeToken={handleRemoveToken}
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
