import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';

export interface Props {
  token: TokenItem;
}

export const TokenLabel: React.FC<Props> = ({ token }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <span
        onClick={() => {
          setVisible(true);
        }}
        className="underline cursor-pointer ml-2"
      >
        {token.name}
      </span>
      <TokenDetailPopup
        variant="add"
        visible={visible}
        onClose={() => setVisible(false)}
        token={token}
      />
    </>
  );
};
