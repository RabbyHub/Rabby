import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from 'ui/utils/token';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  token: TokenItem;
  isNft?: boolean;
}

export const TokenLabel: React.FC<Props> = ({ token, isNft }) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <span
        onClick={() => {
          if (isNft) return;
          setVisible(true);
        }}
        className={clsx('ml-2', {
          'underline cursor-pointer': !isNft,
        })}
      >
        {getTokenSymbol(token)}
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
