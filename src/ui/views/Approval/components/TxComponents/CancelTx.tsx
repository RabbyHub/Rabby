import React from 'react';
// import { ExplainTxResponse } from 'background/service/openapi';

// interface CancelProps {
//   data: ExplainTxResponse;
// }

const CancelTx = () => {
  // const assetChange = data.pre_exec.assets_change[0];
  return (
    <div className="approve">
      <h1 className="tx-header">Cancel Pending Transaction(s)</h1>
      <p className="font-medium text-gray-content text-15">
        All of your pending transactions will be canceled
      </p>
    </div>
  );
};

export default CancelTx;
