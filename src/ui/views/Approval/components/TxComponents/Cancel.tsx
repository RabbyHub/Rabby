import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';

interface CancelProps {
  data: ExplainTxResponse;
}

const Cancel = ({ data }: CancelProps) => {
  const assetChange = data.pre_exec.assets_change[0];
  return (
    <div className="approve">
      <h1 className="tx-header">
        Cancel {assetChange.optimized_symbol} Approval
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

export default Cancel;
