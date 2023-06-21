import { TokenItem } from '@/background/service/openapi';
import { Popup } from '@/ui/component';
import React from 'react';
import TokenDetail from './TokenDetail';
import './style.less';
import { useWallet } from '@/ui/utils';
import { Token } from '@/background/service/preference';

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
  const [isAdded, setIsAdded] = React.useState(false);
  const handleAddToken = React.useCallback(() => {
    if (!token) return;

    if (token?.is_core) {
      wallet.addBlockedToken({
        address: token.id,
        chain: token.chain,
      });
    } else {
      wallet.addCustomizedToken({
        address: token.id,
        chain: token.chain,
      });
    }
    setIsAdded(true);
  }, [token]);

  const handleRemoveToken = React.useCallback(() => {
    if (!token) return;

    if (token?.is_core) {
      wallet.removeBlockedToken({
        address: token.id,
        chain: token.chain,
      });
    } else {
      wallet.removeCustomizedToken({
        address: token.id,
        chain: token.chain,
      });
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
      (item) => item.address === token.id && item.chain === token.chain
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
