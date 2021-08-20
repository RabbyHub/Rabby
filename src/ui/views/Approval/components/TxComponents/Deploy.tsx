import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import IconDeployContract from 'ui/assets/deploy-contract.svg';

const Deploy = ({
  chainEnum,
  data,
  isSpeedUp,
}: {
  chainEnum: CHAINS_ENUM;
  data: ExplainTxResponse;
  isSpeedUp: boolean;
}) => {
  const { t } = useTranslation();
  const chain = CHAINS[chainEnum];
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
        <p className="title">{t('Deploy a Contract')}</p>
        <p className="text-gray-content text-14 mb-0">
          {t('You are deploying a smart contract')}
        </p>
        <img src={IconDeployContract} className="icon icon-cancel-tx" />
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default Deploy;
