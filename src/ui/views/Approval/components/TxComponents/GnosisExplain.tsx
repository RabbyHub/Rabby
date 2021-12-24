import React, { useEffect, useState } from 'react';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import AddressViewer from 'ui/component/AddressViewer';
import { TxTypeComponent } from '../SignTx';
import { useWallet } from 'ui/utils';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';

interface GnosisExplainProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  tx: Tx;
}

const GnosisExplain = ({ data, chainEnum, raw, tx }: GnosisExplainProps) => {
  const [alianName, setAlianName] = useState('');
  const wallet = useWallet();
  const chain = CHAINS[chainEnum];

  const handleChange = () => {
    // NOTHING
  };

  const init = async () => {
    const name = await wallet.getAlianName(tx.to);
    setAlianName(name);
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="gnosis-explain">
      <div className="internal-transaction">
        Internal transaction
        <div className="bg" />
      </div>
      <div className="gnosis-address">
        <img src={IconGnosis} className="icon icon-gnosis" />
        <span className="alian-name">{alianName}</span>
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
