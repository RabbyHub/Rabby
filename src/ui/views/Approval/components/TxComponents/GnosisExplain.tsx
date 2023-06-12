import React from 'react';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { NameAndAddress } from 'ui/component/index';
import { TxTypeComponent } from '../SignTx';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { findChainByEnum } from '@/utils/chain';

interface GnosisExplainProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  tx: Tx;
}

const GnosisExplain = ({ data, chainEnum, raw, tx }: GnosisExplainProps) => {
  const handleChange = () => {
    // NOTHING
  };

  const chainItem = findChainByEnum(chainEnum);

  return (
    <div className="block-field px-16 pb-20">
      <div className="gnosis-explain">
        <div className="internal-transaction">
          Internal transaction
          <div className="bg" />
        </div>
        <div className="gnosis-address">
          <img src={IconGnosis} className="icon icon-gnosis" />
          <NameAndAddress
            address={tx.to}
            nameClass="alian-name max-117"
            noNameClass="no-name"
          />
        </div>
        {chainItem && (
          <TxTypeComponent
            txDetail={data}
            // TODO: confirm it
            chain={chainItem}
            isReady
            raw={raw}
            isSpeedUp={false}
            tx={tx}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
};

export default GnosisExplain;
