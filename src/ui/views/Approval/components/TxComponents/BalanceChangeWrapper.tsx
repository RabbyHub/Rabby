import { ParsedActionData } from '@rabby-wallet/rabby-action';
import { BalanceChange as BalanceChangeType } from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { Divide } from '../Divide';
import BalanceChange from './BalanceChange';

interface Props {
  data: ParsedActionData | null;
  preExecSuccess?: boolean;
  balanceChange?: BalanceChangeType;
  preExecVersion?: 'v0' | 'v1' | 'v2';
}

export const BalanceChangeWrapper: React.FC<Props> = ({
  data,
  balanceChange,
  preExecSuccess,
  preExecVersion = 'v2',
}) => {
  const notShowBalanceChange = React.useMemo(() => {
    if (!data) {
      return true;
    }
    if (
      data.approveNFT ||
      data.approveNFTCollection ||
      data.approveToken ||
      data.cancelTx ||
      data.deployContract ||
      data.pushMultiSig ||
      data.revokeNFT ||
      data.revokeNFTCollection ||
      data.revokeToken ||
      data.permit2BatchRevokeToken ||
      data.revokePermit2
    ) {
      if (!preExecSuccess) return false;

      if (!balanceChange) {
        return true;
      }

      if (
        balanceChange.receive_nft_list.length +
          balanceChange.receive_token_list.length +
          balanceChange.send_nft_list.length +
          balanceChange.send_token_list.length <=
        0
      ) {
        return true;
      }
    }
    return false;
  }, [data]);

  return notShowBalanceChange ? null : (
    <>
      <Divide />
      <BalanceChange version={preExecVersion} data={balanceChange} />
    </>
  );
};
