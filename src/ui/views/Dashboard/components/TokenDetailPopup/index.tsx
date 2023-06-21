import { TokenItem } from '@/background/service/openapi';
import { Popup } from '@/ui/component';
import React from 'react';
import TokenDetail from './TokenDetail';
import './style.less';

interface TokenDetailProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
  addToken(token: TokenItem): void;
  removeToken(token: TokenItem): void;
  variant?: 'add';
}
export const TokenDetailPopup = ({
  token,
  visible,
  onClose,
  addToken,
  removeToken,
  variant,
}: TokenDetailProps) => {
  return (
    <Popup
      visible={visible}
      closable={true}
      height={494}
      onClose={onClose}
      className="token-detail-popup"
    >
      {visible && token && (
        <TokenDetail
          token={token}
          addToken={addToken}
          removeToken={removeToken}
          variant={variant}
        ></TokenDetail>
      )}
    </Popup>
  );
};
