import React from 'react';
import { ExplainTxResponse } from '@/background/service/openapi';
import {
  ApproveToken as ApproveTokenComponent,
  Props as ApproveTokenProps,
} from '../TxComponents/ApproveToken';
import { CHAINS_ENUM } from 'consts';

interface Props {
  detail: NonNullable<ExplainTxResponse['type_token_approval']>;
  chainEnum?: CHAINS_ENUM;
}

export const ApproveToken: React.FC<Props> = ({ detail, chainEnum }) => {
  const data: ApproveTokenProps['detail'] = {
    ...detail,
    token_amount:
      (detail.token_amount || 0) / Math.pow(10, detail.token.decimals),
  };

  return (
    <div className="approve mt-8">
      <ApproveTokenComponent detail={data} chainEnum={chainEnum} />
    </div>
  );
};
