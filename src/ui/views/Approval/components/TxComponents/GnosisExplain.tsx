import React from 'react';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import AddressViewer from 'ui/component/AddressViewer';
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
  console.log(data, tx);
  return (
    <div className="gonsis-explain">
      <div className="gnosis-address">
        <img src={IconGnosis} className="icon icon-gnosis" />
        <AddressViewer address={tx.to} showArrow={false} />
      </div>
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
