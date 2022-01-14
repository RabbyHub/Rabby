import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { NameAndAddress } from 'ui/component';
import { ellipsisOverflowedText } from 'ui/utils';

import { splitNumberByStep } from 'ui/utils/number';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';

interface SendProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

const Send = ({ data, chainEnum, isSpeedUp, raw }: SendProps) => {
  const detail = data.type_send!;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();
  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi,
    });
  };
  return (
    <div className="send">
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
        <p className="title">{t('Send Token')}</p>
        <div className="block-field">
          <span className="label">{t('Amount')}</span>
          <div className="value">
            {ellipsisOverflowedText(splitNumberByStep(detail.token_amount), 12)}{' '}
            <span title={detail.token_symbol}>
              {ellipsisOverflowedText(detail.token_symbol, 6)}
            </span>
            <p className="est-price">
              ≈ $
              {splitNumberByStep(
                new BigNumber(detail.token_amount)
                  .times(detail.token.price)
                  .toFixed(2)
              )}
            </p>
          </div>
        </div>
        <div className="block-field contract">
          <span className="label">{t('To address')}</span>
          <span className="value">
            <NameAndAddress
              address={detail.to_addr}
              className="text-13"
              nameClass="max-117 text-13"
              addressClass="text-13"
            />
          </span>
        </div>
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default Send;
