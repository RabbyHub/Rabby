import React from 'react';
import { ExplainTxResponse } from '@/background/service/openapi';
import {
  ApproveToken,
  Props as ApproveTokenProps,
} from './TxComponents/ApproveToken';

interface Props {
  explain: ExplainTxResponse;
}

export const PermitSignTypedSignSection: React.FC<Props> = ({ explain }) => {
  const permit = explain.type_token_approval;
  if (!permit) {
    return null;
  }

  const detail: ApproveTokenProps['detail'] = {
    ...permit,
    token_amount:
      (permit.token_amount || 0) / Math.pow(10, permit.token.decimals),
  };

  return (
    <div>
      <div className="mt-20 text-14 leading-4">
        This is a Permit Token Approval signature
      </div>
      <div className="approve mt-8">
        <ApproveToken detail={detail} />
      </div>
    </div>
  );
};
