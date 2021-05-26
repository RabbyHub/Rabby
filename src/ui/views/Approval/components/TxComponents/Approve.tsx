import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';
import { MAX_LIMITED_COUNT } from 'consts';

interface ApproveProps {
  data: ExplainTxResponse;
}

const Approve = ({ data }: ApproveProps) => {
  const assetChange = data.pre_exec.assets_change[0];
  const isUnlimited = assetChange.amount > MAX_LIMITED_COUNT;
  return (
    <div className="approve">
      <h1 className="tx-header">
        Approve {isUnlimited ? 'unlimited' : assetChange.amount}{' '}
        {assetChange.optimized_symbol}
      </h1>
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

export default Approve;
