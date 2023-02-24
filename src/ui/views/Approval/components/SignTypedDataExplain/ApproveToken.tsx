import { ExplainTypedDataResponse } from '@debank/rabby-api/dist/types';
import { CHAINS_ENUM } from 'consts';
import React from 'react';
import {
  ApproveToken as ApproveTokenComponent,
  Props as ApproveTokenProps,
} from '../TxComponents/ApproveToken';

interface Props {
  detail: NonNullable<ExplainTypedDataResponse['type_token_approval']>;
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
