import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';

interface SignProps {
  data: ExplainTxResponse;
}

const Sign = ({ data }: SignProps) => {
  const assetsChange = data.pre_exec.assets_change;
  return (
    <div className="sign">
      <h1 className="tx-header">Sign Transaction</h1>
      <p className="tx-subtitle text-gray-content text-14">
        Intereact with contract
      </p>
      <div className="tx-target">
        {data.tx.to}
        <ul className="tags">
          {data.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </div>
      <p className="tx-subtitle text-gray-content text-14">
        Balance changes after this transaction (est.)
      </p>
      <ul className="assets-change">
        {assetsChange.map((item) => (
          <li key={item.id}>
            <div className="token">
              <img
                src={item.logo_url}
                alt={item.optimized_symbol}
                className="icon icon-token"
              />
              {item.optimized_symbol}
            </div>
            <div className="amount">{item.amount}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sign;
