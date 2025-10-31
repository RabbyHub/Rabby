import React from 'react';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import {
  normalizeTxParams,
  TxTypeComponent,
} from '@/ui/views/Approval/components/SignTx';
import { findChainByID } from '@/utils/chain';
import { noop } from 'lodash';
import { INTERNAL_REQUEST_SESSION, INTERNAL_REQUEST_ORIGIN } from '@/constant';

import type { ExplainTxResponse, Tx } from '@rabby-wallet/rabby-api/dist/types';
import type { SecurityResult } from '../domain';
import { Account } from '@/background/service/preference';

export const MiniSecurityHeader: React.FC<{
  engineResults?: SecurityResult;
  tx: Tx;
  txDetail: ExplainTxResponse;
  session?: typeof INTERNAL_REQUEST_SESSION;
  account: Account;
  isReady: boolean;
}> = ({
  engineResults,
  tx,
  txDetail,
  session = INTERNAL_REQUEST_SESSION,
  account,
  isReady,
}) => {
  if (!account) return null;

  const {
    parsedTransactionActionData,
    actionRequireData,
    parsedTransactionActionDataList,
    actionRequireDataList,
    engineResultList,
    engineResult,
  } = engineResults || {};

  const chain = findChainByID(tx.chainId)!;
  const { isSpeedUp } = normalizeTxParams(tx);

  return (
    <TxTypeComponent
      account={account}
      isReady={isReady}
      actionData={parsedTransactionActionData || {}}
      actionRequireData={actionRequireData || {}}
      chain={chain}
      txDetail={txDetail}
      raw={{ ...tx }}
      onChange={noop}
      isSpeedUp={isSpeedUp}
      engineResults={engineResult || engineResultList?.[0] || []}
      origin={session.origin}
      originLogo={session.icon}
      multiAction={
        engineResultList
          ? {
              actionList: parsedTransactionActionDataList!,
              requireDataList: actionRequireDataList!,
              engineResultList: engineResultList!,
            }
          : undefined
      }
    />
  );
};
