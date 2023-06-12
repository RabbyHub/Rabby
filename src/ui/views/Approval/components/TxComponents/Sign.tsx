import { ExplainTxResponse, Tx } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import { NameAndAddress } from 'ui/component';
import BalanceChange from './BalanceChange';
import GnosisExplain from './GnosisExplain';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { findChainByEnum } from '@/utils/chain';

interface SignProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  isSpeedUp: boolean;
  tx: Tx;
}

const Sign = ({ data, chainEnum, raw, isSpeedUp, tx }: SignProps) => {
  const detail = data.type_call!;
  const { t } = useTranslation();

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };

  const handleProtocolLogoLoadFailed = function (
    e: React.SyntheticEvent<HTMLImageElement>
  ) {
    e.currentTarget.src = IconUnknownProtocol;
  };

  return (
    <div className="sign section-block">
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
      <div className="action-card common-detail-block">
        <div className="tx-action flex items-center gap-[12px] p-[16px]">
          {isSpeedUp && <SpeedUpCorner />}
          <div>
            <img
              src={detail.contract_protocol_logo_url || IconUnknownProtocol}
              className="w-[40px] h-[40px] rounded-full"
              onError={handleProtocolLogoLoadFailed}
            />
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
                openExternal
                chainEnum={chainEnum}
              />
            </div>
          </div>
        </div>
        <BalanceChange
          version={data.pre_exec_version}
          data={data.balance_change}
          chainEnum={chainEnum}
          isSupport={data.support_balance_change}
          isGnosis={!!data.gnosis}
        />
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
      </div>
    </div>
  );
};

export default Sign;
