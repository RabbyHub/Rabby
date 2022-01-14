import { TokenItem } from '@/background/service/openapi';
import { Popup } from '@/ui/component';
import React from 'react';
import TokenDetail from './TokenDetail';
import './style.less';

interface TokenDetailProps {
  visible?: boolean;
  onClose?(): void;
  token?: TokenItem | null;
}
export const TokenDetailPopup = ({
  token,
  visible,
  onClose,
}: TokenDetailProps) => {
  return (
    <Popup
      visible={visible}
      closable={true}
      height={580}
      onClose={onClose}
      className="token-detail-popup"
    >
      {visible && token && <TokenDetail token={token}></TokenDetail>}
    </Popup>
  );
};
