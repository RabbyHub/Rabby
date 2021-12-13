import React from 'react';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { TxTypeComponent } from '../SignTx';

interface GnosisExplainProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string>;
  tx: Tx;
}

const GnosisExplain = ({ data, chainEnum, raw, tx }: GnosisExplainProps) => {
  const chain = CHAINS[chainEnum];
  const handleChange = () => {
    // TODO
  };

  return (
    <div className="gonsis-explain">
      <TxTypeComponent
        txDetail={data}
        chain={chain}
        isReady
        raw={raw}
        isSpeedUp={false}
        tx={tx}
        onChange={handleChange}
      />
    </div>
  );
};

export default GnosisExplain;
