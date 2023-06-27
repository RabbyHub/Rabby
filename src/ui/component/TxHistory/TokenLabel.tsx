import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from 'ui/utils/token';
import clsx from 'clsx';
import React from 'react';

export interface Props {
  token: TokenItem;
  isNft?: boolean;
  canClickToken?: boolean;
}

export const TokenLabel: React.FC<Props> = ({
  token,
  isNft,
  canClickToken = true,
}) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <span
        onClick={() => {
          if (isNft || !canClickToken) return;
          setVisible(true);
        }}
        className={clsx('ml-2', {
          'underline cursor-pointer': !isNft && canClickToken,
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
