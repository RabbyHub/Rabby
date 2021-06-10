import React from 'react';
import { CHAINS, CHAINS_ENUM } from 'consts';

const CancelTx = ({ chainEnum }: { chainEnum: CHAINS_ENUM }) => {
  const chain = CHAINS[chainEnum];
  return (
    <div className="cancel-tx">
      <p className="section-title">Sign {chain.name} transaction</p>
      <div className="gray-section-block common-detail-block">
        <p className="title">Cancel Pending Transaction</p>
        <p className="text-gray-content text-14 mb-0">
          One pending transaction will be canceled
        </p>
      </div>
    </div>
  );
};

export default CancelTx;
