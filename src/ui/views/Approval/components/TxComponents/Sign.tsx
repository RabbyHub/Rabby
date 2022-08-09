import { ExplainTxResponse, Tx } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { NameAndAddress } from 'ui/component';
import BalanceChange from './BalanceChange';
import GnosisExplain from './GnosisExplain';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import { ReactComponent as IconUnknownProtocol } from 'ui/assets/unknown-protocol.svg';
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

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };

  const isUnknown = !data?.abi && !detail.action;

  return (
    <div className="sign section-block">
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
      <div className="action-card common-detail-block">
        <div className="tx-action flex items-center gap-[12px] p-[16px]">
          {isSpeedUp && <SpeedUpCorner />}
          <div>
            {detail.contract_protocol_logo_url && (
              <img
                src={detail.contract_protocol_logo_url}
                className="w-[40px] h-[40px] rounded-full"
              />
            )}
            {!detail.contract_protocol_logo_url && isUnknown ? (
              <IconUnknownProtocol
                className="w-[40px] h-[40px]"
                viewBox="0 0 36 36"
              />
            ) : null}
          </div>
          <div className="section-card-content">
            <div className="section-card-title">
              {detail.action || t('Unknown Action')}
            </div>
            <div className="section-card-desc flex item-center">
              <span>
                {detail.contract_protocol_name || t('Unknown Protocol')}
              </span>
              <NameAndAddress
                className="ml-auto"
                address={detail.contract}
                nameClass="max-90"
                noNameClass="no-name"
              />
            </div>
          </div>
        </div>
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
        />
        {data.gnosis && (
          <div className="block-field">
            <GnosisExplain
              data={{
                ...data.gnosis,
                support_balance_change: data.support_balance_change,
              }}
              chainEnum={chainEnum}
              tx={tx}
              raw={raw}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Sign;
