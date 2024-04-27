import { TokenItem } from '@/background/service/openapi';
import { Popup } from '@/ui/component';
import React from 'react';
import TokenDetail from './TokenDetail';
import './style.less';
import { isSameAddress, useWallet } from '@/ui/utils';
import { Token } from '@/background/service/preference';
import { useRabbyDispatch } from 'ui/store';
import { DisplayedToken } from 'ui/utils/portfolio/project';
import { AbstractPortfolioToken } from 'ui/utils/portfolio/types';

interface TokenDetailProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
  variant?: 'add';
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
}
export const TokenDetailPopup = ({
  token,
  visible,
  onClose,
  variant,
  canClickToken = true,
  hideOperationButtons = false,
}: TokenDetailProps) => {
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
    <Popup
      visible={visible}
      closable={true}
      height={494}
      onClose={onClose}
      className="token-detail-popup"
      push={false}
    >
      {visible && token && (
        <TokenDetail
          token={token}
          addToken={handleAddToken}
          removeToken={handleRemoveToken}
          variant={variant}
          isAdded={isAdded}
          onClose={onClose}
          canClickToken={canClickToken}
          hideOperationButtons={hideOperationButtons}
        />
      )}
    </Popup>
  );
};
