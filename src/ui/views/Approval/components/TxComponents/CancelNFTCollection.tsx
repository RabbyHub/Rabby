import useBalanceChange from '@/ui/hooks/useBalanceChange';
import { ellipsis } from '@/ui/utils/address';
import { ExplainTxResponse } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';
import IconExternal from 'ui/assets/icon-share.svg';
import { openInTab } from '@/ui/utils';
import { Copy } from '@/ui/component';
import { findChainByEnum } from '@/utils/chain';

interface CancelNFTCollectionProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  isSpeedUp: boolean;
  raw: Record<string, string | number>;
}

const CancelNFTCollection = ({
  data,
  chainEnum,
  isSpeedUp,
  raw,
}: CancelNFTCollectionProps) => {
  const detail = data.type_cancel_nft_collection_approval!;
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

  const bfInfo = useBalanceChange(data);

  const handleClickContractId = (id: string) => {
    const chainItem = findChainByEnum(chainEnum);
    openInTab(chainItem?.scanLink.replace(/tx\/_s_/, `address/${id}`), false);
  };

  return (
    <div
      className={clsx(
        'cancel-nft-collection',
        bfInfo.belowBlockIsEmpty && 'below-bc-block-empty'
      )}
    >
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
          <p className="title">{t('Cancel NFT Collection Approval')}</p>
          <div className="nft-collection">
            <div className="rabby-list">
              <div className="item">
                <div className="label">Collection</div>
                <div className="value">
                  {detail.nft_contract?.collection?.name || t('Unknown')}
                </div>
              </div>
              <div className="item">
                <div className="label">Contract</div>
                <div className="value flex items-center gap-6">
                  {ellipsis(detail.nft_contract?.id)}
                  <img
                    src={IconExternal}
                    className="icon icon-copy w-[14px] h-[14px] cursor-pointer"
                    onClick={() =>
                      handleClickContractId(detail.nft_contract?.id)
                    }
                  />
                  <Copy variant="address" data={detail.nft_contract?.id}></Copy>
                </div>
              </div>
            </div>
          </div>
          <div className="rabby-list px-[13px]">
            <div className="item">
              <div className="label min-w-[80px]">Spender</div>
              <div className="value flex items-center gap-8">
                <img
                  className="logo"
                  src={detail.spender_protocol_logo_url || IconUnknownProtocol}
                  onError={handleProtocolLogoLoadFailed}
                />
                <div className="name">
                  {detail.spender_protocol_name || t('Unknown')}
                </div>
                <div className="address flex gap-6">
                  {ellipsis(detail.spender)}
                  <img
                    src={IconExternal}
                    className="icon icon-copy w-[14px] h-[14px] cursor-pointer"
                    onClick={() => handleClickContractId(detail.spender)}
                  />
                  <Copy variant="address" data={detail.spender}></Copy>
                </div>
              </div>
            </div>
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

export default CancelNFTCollection;
