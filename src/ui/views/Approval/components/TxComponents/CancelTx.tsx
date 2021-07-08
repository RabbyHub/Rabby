import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import BalanceChange from './BalanceChange';

const CancelTx = ({
  chainEnum,
  data,
}: {
  chainEnum: CHAINS_ENUM;
  data: ExplainTxResponse;
}) => {
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();
  return (
    <div className="cancel-tx">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ names: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <p className="title">{t('Cancel Pending Transaction')}</p>
        <p className="text-gray-content text-14 mb-0">
          {t('One pending transaction will be canceled')}
        </p>
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
