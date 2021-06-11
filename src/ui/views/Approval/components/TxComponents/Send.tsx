import React from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';

interface SendProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
}

const Send = ({ data, chainEnum }: SendProps) => {
  const detail = data.type_send!;
  const chain = CHAINS[chainEnum];
  return (
    <div className="send">
      <p className="section-title">Sign {chain.name} transaction</p>
      <div className="gray-section-block common-detail-block">
        <p className="title">
          Send {splitNumberByStep(detail.token_amount)} {detail.token_symbol} to
        </p>
        <p className="text-gray-content text-13 font-medium mb-0 font-roboto-mono whitespace-nowrap">
          {detail.to_addr}
        </p>
      </div>
    </div>
  );
};

export default Send;
