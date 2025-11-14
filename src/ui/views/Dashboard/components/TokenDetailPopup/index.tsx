import { TokenItem } from '@/background/service/openapi';
import { Popup } from '@/ui/component';
import React from 'react';
import TokenDetail from './TokenDetail';
import './style.less';
import { getUiType, isSameAddress, useWallet } from '@/ui/utils';
import { Account, Token } from '@/background/service/preference';
import { useRabbyDispatch } from 'ui/store';
import { DisplayedToken } from 'ui/utils/portfolio/project';
import { AbstractPortfolioToken } from 'ui/utils/portfolio/types';
import { useLocation } from 'react-router-dom';
import { DrawerProps } from 'antd';

const isDesktop = getUiType().isDesktop;

interface TokenDetailProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
  variant?: 'add';
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
  tipsFromTokenSelect?: string;
  account?: Account;
  getContainer?: DrawerProps['getContainer'];
}
export const TokenDetailPopup = ({
  token,
  visible,
  onClose,
  variant,
  canClickToken = true,
  hideOperationButtons = false,
  tipsFromTokenSelect,
  account,
  getContainer: getContainerProps,
}: TokenDetailProps) => {
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [isAdded, setIsAdded] = React.useState(false);

  const location = useLocation();
  const action = new URLSearchParams(location.search).get('action');
  const isInDesktopActionModal =
    isDesktop &&
    (action === 'send' || action === 'swap' || action === 'bridge');
  const isInSendModal =
    new URLSearchParams(location.search).get('action') === 'send';
  const getContainer = isInDesktopActionModal
    ? isInSendModal
      ? '.js-rabby-popup-container'
      : '.js-rabby-desktop-swap-container'
    : getContainerProps;
  const isInSwap = location.pathname === '/dex-swap';
  const isInSend = location.pathname === '/send-token';
  const isBridge = location.pathname === '/bridge';

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

  const popupHeight = isInSend || isInSwap || isBridge ? 540 : 500;

  return (
    <Popup
      visible={visible}
      closable={true}
      height={popupHeight}
      onClose={onClose}
      className="token-detail-popup"
      push={false}
      getContainer={getContainer}
    >
      {visible && token && (
        <TokenDetail
          account={account}
          token={token}
          popupHeight={popupHeight}
          addToken={handleAddToken}
          removeToken={handleRemoveToken}
          variant={variant}
          isAdded={isAdded}
          onClose={onClose}
          canClickToken={canClickToken}
          hideOperationButtons={hideOperationButtons}
          tipsFromTokenSelect={tipsFromTokenSelect}
        />
      )}
    </Popup>
  );
};
