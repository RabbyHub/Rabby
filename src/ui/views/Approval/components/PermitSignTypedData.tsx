import React from 'react';
import { ExplainTxResponse } from '@/background/service/openapi';
import {
  ApproveToken,
  Props as ApproveTokenProps,
} from './TxComponents/ApproveToken';
import { CHAINS_ENUM } from 'consts';

interface Props {
  explain: {
    type_token_approval?: ExplainTxResponse['type_token_approval'];
  };
  chainEnum?: CHAINS_ENUM;
}

export const PermitSignTypedSignSection: React.FC<Props> = ({
  explain,
  chainEnum,
}) => {
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
        <ApproveToken detail={detail} chainEnum={chainEnum} />
      </div>
    </div>
  );
};
