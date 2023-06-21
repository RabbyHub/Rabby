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
}
export const TokenDetailPopup = ({
  token,
  visible,
  onClose,
  variant,
}: TokenDetailProps) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [isAdded, setIsAdded] = React.useState(false);
  const handleAddToken = React.useCallback(() => {
    if (!token) return;

    if (token.is_core) {
      dispatch.account.addBlockedToken(
        new DisplayedToken(token) as AbstractPortfolioToken
      );
    } else {
      dispatch.account.addCustomizeToken(
        new DisplayedToken(token) as AbstractPortfolioToken
      );
    }
    setIsAdded(true);
  }, [token]);

  const handleRemoveToken = React.useCallback(() => {
    if (!token) return;

    if (token?.is_core) {
      dispatch.account.removeBlockedToken(
        new DisplayedToken(token) as AbstractPortfolioToken
      );
    } else {
      dispatch.account.removeCustomizeToken(
        new DisplayedToken(token) as AbstractPortfolioToken
      );
    }
    setIsAdded(false);
  }, [token]);

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
        ></TokenDetail>
      )}
    </Popup>
  );
};
