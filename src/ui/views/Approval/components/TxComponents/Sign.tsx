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
            <div className="token" title={item.symbol}>
              <img
                src={item.logo_url}
                alt={item.symbol}
                className="icon icon-token"
              />
              {item.symbol.length > 8
                ? item.symbol.slice(0, 8) + '...'
                : item.symbol}
            </div>
            <div
              className="amount"
              title={`${item.amount > 0 ? '+' : ''}${item.amount}`}
            >
              {item.amount > 0 ? '+' : ''}
              {item.amount}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sign;
