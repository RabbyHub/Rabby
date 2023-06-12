import React from 'react';
import { ExplainTxResponse } from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import { NameAndAddress } from 'ui/component';
import { ellipsisOverflowedText } from 'ui/utils';

import { splitNumberByStep } from 'ui/utils/number';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import { findChainByEnum } from '@/utils/chain';

interface SendProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

const Send = ({ data, chainEnum, isSpeedUp, raw }: SendProps) => {
  const detail = data.type_send!;
  const { t } = useTranslation();
  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };
  return (
    <div className="send">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: findChainByEnum(chainEnum)?.name || '' }}
        />
        <span
          className="float-right text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('View Raw')}
          <img src={IconArrowRight} />
        </span>
      </p>
      <div className="action-card">
        <div className="common-detail-block">
          {isSpeedUp && <SpeedUpCorner />}
          <p className="title">{t('Send Token')}</p>
          <div className="block-field">
            <span className="label pt-2">{t('Amount')}</span>
            <div className="value">
              <span className="value-strong">
                {ellipsisOverflowedText(
                  splitNumberByStep(detail.token_amount),
                  12
                )}{' '}
                <span title={detail.token_symbol}>
                  {ellipsisOverflowedText(detail.token_symbol, 6)}
                </span>
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
          <div className="block-field contract items-center">
            <span className="label">{t('To address')}</span>
            <span className="value">
              <NameAndAddress address={detail.to_addr} nameClass="max-117" />
            </span>
          </div>
        </div>
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
        />
      </div>
    </div>
  );
};

export default Send;
