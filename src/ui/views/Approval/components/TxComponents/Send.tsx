import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';

interface SendProps {
  data: ExplainTxResponse;
}

const Send = ({ data }: SendProps) => {
  const assetChange = data.pre_exec.assets_change[0];
  return (
    <div className="send">
      <h1 className="tx-header text-center">Send Token</h1>
      <div className="token-detail">
        <img src={assetChange.logo_url} className="icon icon-token" />
        <p>
          <span className="token-amount">{assetChange.amount}</span>
          {assetChange.optimized_symbol}
        </p>
      </div>
      <p className="tx-subtitle text-gray-content text-14">To spender</p>
      <div className="tx-target">
        {data.tx.to}
        <ul className="tags">
          {data.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Send;
