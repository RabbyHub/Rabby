import React from 'react';
import { message } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import ClipboardJS from 'clipboard';
import { AddressViewer } from 'ui/component';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { ExplainTxResponse } from 'background/service/openapi';
import { Modal } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

interface SignProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string>;
  isSpeedUp: boolean;
}

const Sign = ({ data, chainEnum, raw, isSpeedUp }: SignProps) => {
  const detail = data.type_call!;
  const chain = CHAINS[chainEnum];
  const { t } = useTranslation();
  const handleCopySpender = () => {
    const clipboard = new ClipboardJS('.sign', {
      text: function () {
        return detail.contract;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

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
    <div className="sign">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
        <span
          className="float-right text-gray-comment text-12 cursor-pointer flex items-center view-raw"
          onClick={handleViewRawClick}
        >
          {t('view Raw')}
          <img src={IconArrowRight} />
        </span>
      </p>
      <div className="gray-section-block common-detail-block">
        {isSpeedUp && <SpeedUpCorner />}
        <div className="block-field">
          <span className="label">{t('Protocol')}</span>
          <span className="value">
            {detail.contract_protocol_name || t('Unknown Protocol')}
          </span>
        </div>
        <div className="block-field">
          <span className="label">{t('Action')}</span>
          <span className="value">{detail.action || t('Unknown Action')}</span>
        </div>
        <div className="block-field contract">
          <span className="label">{t('Contract')}</span>
          <span className="value">
            <AddressViewer address={detail.contract} showArrow={false} />
            <img
              src={IconCopy}
              className="icon icon-copy"
              onClick={handleCopySpender}
            />
          </span>
        </div>
        {detail.contract_protocol_logo_url && (
          <img
            src={detail.contract_protocol_logo_url}
            className="contract-logo"
          />
        )}
      </div>
      <BalanceChange
        data={data.balance_change}
        chainEnum={chainEnum}
        isSupport={data.support_balance_change}
      />
    </div>
  );
};

export default Sign;
