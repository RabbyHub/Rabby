import React from 'react';
import { Trans } from 'react-i18next';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import { splitNumberByStep } from 'ui/utils/number';
import BalanceChange from './BalanceChange';

interface SendProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
}

const Send = ({ data, chainEnum }: SendProps) => {
  const detail = data.type_send!;
  const chain = CHAINS[chainEnum];
  return (
    <div className="send">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <p className="title">
          <Trans
            i18nKey="sendTokenTo"
            values={{
              amount: splitNumberByStep(detail.token_amount),
              symbol: detail.token_symbol,
            }}
          />
        </p>
        <p className="text-gray-content text-13 font-medium mb-0 font-roboto-mono">
          {detail.to_addr}
        </p>
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default Send;
