import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import { splitNumberByStep } from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import {
  ExplainTxResponse,
  NFTItem,
  TransferingNFTItem,
} from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconSwapArrowDown } from 'ui/assets/arrow-down.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { NameAndAddress } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';

function NFTList({
  list,
}: {
  list: NonNullable<ExplainTxResponse['type_list_nft']>['offer_list'];
}) {
  const NFTListCountLimit = 2;
  const [isShowAll, setIsShowAll] = React.useState(false);
  const renderList = useMemo(() => {
    const _list = list.slice().sort((a, b) => {
      if (!a.nft?.name) {
        return 1;
      }
      if (!b.nft?.name) {
        return -1;
      }
      return a.nft?.name > b.nft?.name ? 1 : -1;
    });
    return isShowAll ? _list : _list?.slice(0, NFTListCountLimit) || [];
  }, [isShowAll, list]);

  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);

  if (list.length === 0) {
    return null;
  }

  return (
    <>
      <div className="type-list-nft-list">
        {renderList?.map((item, idx) => {
          return (
            <div
              key={idx}
              className={clsx('type-list-nft-list-item')}
              onClick={() => {
                setFocusingNFT({ ...item.nft, amount: item.amount });
              }}
            >
              <div className="nft-item-wrapper">
                <div
                  title={item.nft?.name}
                  className="nft-detail-anchor"
                  onClick={() => {
                    setFocusingNFT(item.nft);
                  }}
                >
                  <NFTAvatar
                    className="nft-item-avatar"
                    thumbnail
                    content={item.nft?.content}
                    type={item.nft?.content_type}
                  />
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="type-list-nft-list-item-title">
                  {item.nft?.name}
                </div>
                <div className="type-list-nft-list-item-desc">
                  {item.nft?.collection?.name || '-'}
                </div>
              </div>
              {item && item.amount > 1 ? (
                <div className="type-list-nft-list-item-extra">
                  x{item.amount}
                </div>
              ) : null}
            </div>
          );
        })}
        {!isShowAll && list?.length > NFTListCountLimit && (
          <div
            className="type-list-nft-list-footer"
            onClick={() => {
              setIsShowAll(true);
            }}
          >
            +{list.length - NFTListCountLimit} NFTs{' '}
            <IconSwapArrowDown></IconSwapArrowDown>
          </div>
        )}
      </div>
      {focusingNFT && (
        <ModalPreviewNFTItem
          nft={(focusingNFT as any) as TransferingNFTItem}
          onCancel={() => setFocusingNFT(null)}
        />
      )}
    </>
  );
}

interface ListNFTProps {
  data: ExplainTxResponse;
  chainEnum: CHAINS_ENUM;
  raw: Record<string, string | number>;
  isSpeedUp: boolean;
}

const ListNFT = ({ data, chainEnum, raw, isSpeedUp }: ListNFTProps) => {
  const detail = data.type_list_nft!;
  const chain = CHAINS[chainEnum];
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

  const isUnknown = !data?.abi && !detail.action;

  return (
    <div className="type-list-nft section-block">
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
      <div className="action-card">
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
              />
            </div>
          </div>
        </div>
        <div className="type-list-nft-explain">
          <div className="type-list-nft-explain-title">
            You are about to list{' '}
            <strong>{detail.offer_list.length} NFTs</strong> with total{' '}
            <strong>
              ${splitNumberByStep((detail.total_usd_value || 0).toFixed(2))}
            </strong>
            {detail.buyer_list && detail.buyer_list.length > 0 ? (
              <>
                {' '}
                for specific buyer{' '}
                {detail.buyer_list?.map((item) => {
                  return (
                    <NameAndAddress
                      address={item.id}
                      nameClass="max-90"
                      noNameClass="no-name"
                    />
                  );
                })}
              </>
            ) : null}
          </div>
          <NFTList list={data.type_list_nft?.offer_list || []}></NFTList>
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

export default ListNFT;
