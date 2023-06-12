import { ExplainTxResponse } from 'background/service/openapi';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import { ExplainListNFT } from './ExplainListNFT';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import { findChainByEnum } from '@/utils/chain';

interface ListNFTProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  isSpeedUp: boolean;
}

const ListNFT = ({ data, chainEnum, raw, isSpeedUp }: ListNFTProps) => {
  const detail = data.type_list_nft!;
  const { t } = useTranslation();

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw,
      abi: data?.abi_str,
    });
  };

  return (
    <div className="type-list-nft section-block">
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
        <div className="common-detail-block h-0 p-0 min-h-0">
          {isSpeedUp && <SpeedUpCorner />}
        </div>
        <ExplainListNFT detail={detail} chainEnum={chainEnum} />
      </div>
    </div>
  );
};

export default ListNFT;
