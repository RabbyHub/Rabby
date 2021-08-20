import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import IconCancelTx from 'ui/assets/cancel-tx.svg';

const CancelTx = ({
  chainEnum,
  data,
  tx,
  isSpeedUp,
}: {
  chainEnum: CHAINS_ENUM;
  data: ExplainTxResponse;
  tx: Tx;
  isSpeedUp: boolean;
}) => {
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();
  return (
    <div className="cancel-tx">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        {isSpeedUp && <SpeedUpCorner />}
        <p className="title">{t('Cancel Pending Transaction')}</p>
        <p className="text-gray-content text-14 mb-0">
          Nonce: {Number(tx.nonce)}
        </p>
        <img src={IconCancelTx} className="icon icon-cancel-tx" />
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default CancelTx;
