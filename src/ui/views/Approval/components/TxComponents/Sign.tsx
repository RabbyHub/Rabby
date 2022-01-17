import { message } from 'antd';
import { ExplainTxResponse, Tx } from 'background/service/openapi';
import ClipboardJS from 'clipboard';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconCopy from 'ui/assets/copy-no-border.svg';
import IconSuccess from 'ui/assets/success.svg';
import { AddressViewer, NameAndAddress } from 'ui/component';
import BalanceChange from './BalanceChange';
import GnosisExplain from './GnosisExplain';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
interface SignProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  isSpeedUp: boolean;
  tx: Tx;
}

const Sign = ({ data, chainEnum, raw, isSpeedUp, tx }: SignProps) => {
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
    ViewRawModal.open({
      raw,
      abi: data?.abi,
    });
  };

  return (
    <div className="sign">
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
            <NameAndAddress
              address={detail.contract}
              nameClass="text-15 max-90"
              addressClass="text-15"
              noNameClass="no-name"
            />
          </span>
        </div>
        {data.gnosis && (
          <GnosisExplain
            data={{
              ...data.gnosis,
              support_balance_change: data.support_balance_change,
            }}
            chainEnum={chainEnum}
            tx={tx}
            raw={raw}
          />
        )}
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
