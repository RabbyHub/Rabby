import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import { Modal } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import IconDeployContract from 'ui/assets/deploy-contract.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

const Deploy = ({
  chainEnum,
  data,
  isSpeedUp,
  raw,
}: {
  chainEnum: CHAINS_ENUM;
  data: ExplainTxResponse;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}) => {
  const { t } = useTranslation();
  const chain = CHAINS[chainEnum];

  const handleViewRawClick = () => {
    try {
      const content = JSON.stringify(raw, null, 4);

      Modal.info({
        title: t('Transaction detail'),
        centered: true,
        content,
        cancelText: null,
        okText: null,
        className: 'transaction-detail',
      });
    } catch (error) {
      console.log('stringify raw fail', error);
    }
  };

  return (
    <div className="cancel-tx">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
        <span
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('View Raw')}
          <img src={IconArrowRight} />
        </span>
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
