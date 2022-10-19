import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import LessPalette, { ellipsis } from '@/ui/style/var-defs';
import { splitNumberByStep } from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { Tooltip } from 'antd';
import {
  ExplainTxResponse,
  NFTItem,
  TransferingNFTItem,
} from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { useMemo, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as IconSwapArrowDown } from 'ui/assets/arrow-down.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import { NameAndAddress } from 'ui/component';
import BalanceChange from './BalanceChange';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';

const NFTListWrapper = styled.div`
  background: #f5f6fa;
  border-radius: 4px;
  .type-list-nft-list {
    &-footer {
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: ${LessPalette['@primary-color']};
      cursor: pointer;

      svg {
        path {
          fill: ${LessPalette['@primary-color']};
        }
      }
    }

    &-item {
      display: flex;
      gap: 8px;
      border-radius: 4px;
      padding: 12px;
      cursor: pointer;
      border: 1px solid transparent;
      border: 0.5px solid transparent;
      position: relative;
      align-items: center;

      &:not(:last-child)::before {
        content: '';
        position: absolute;
        left: 12px;
        right: 12px;
        bottom: 0;
        height: 1px;
        background: #e5e9ef;
      }

      &:hover {
        background-color: rgba(134, 151, 255, 0.2);
        border-color: #8697ff;
      }

      &-title {
        font-weight: 500;
        font-size: 12px;
        line-height: 14px;
        color: ${LessPalette['@color-title']};
        margin-bottom: 2px;
        ${ellipsis()}
      }
      &-desc {
        font-weight: 400;
        font-size: 12px;
        line-height: 14px;
        color: ${LessPalette['@color-body']};
        ${ellipsis()}
      }
      &-extra {
        font-weight: 500;
        font-size: 15px;
        line-height: 18px;
        color: ${LessPalette['@color-body']};
        margin-left: auto;
      }
      .nft-avatar {
        width: 28px;
        height: 28px;
        background-color: rgb(204, 204, 204);
      }
    }
  }
`;

export function NFTList({
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

  const rest = useMemo(() => {
    const total = list.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
    return (
      total -
      renderList.slice(0, NFTListCountLimit).reduce((acc, cur) => {
        return acc + (cur.amount || 0);
      }, 0)
    );
  }, [renderList, list]);

  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);

  if (list.length === 0) {
    return null;
  }

  return (
    <>
      <NFTListWrapper className="type-list-nft-list">
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
        {!isShowAll && rest > 0 && (
          <div
            className="type-list-nft-list-footer"
            onClick={() => {
              setIsShowAll(true);
            }}
          >
            +{rest} NFTs <IconSwapArrowDown></IconSwapArrowDown>
          </div>
        )}
      </NFTListWrapper>
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

  const totalNFTAmount = useMemo(() => {
    return detail.offer_list?.reduce((acc, cur) => {
      return acc + (cur.amount || 0);
    }, 0);
  }, [detail.offer_list]);

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
            You're about to list <strong>{totalNFTAmount} NFTs</strong> with a
            total of{' '}
            <strong>
              ${splitNumberByStep((detail.total_usd_value || 0).toFixed(2))}
            </strong>{' '}
            {detail.buyer_list && detail.buyer_list.length > 0 ? (
              <>
                for the specific buyer{' '}
                {detail.buyer_list?.map((item) => {
                  return (
                    <NameAndAddress
                      key={item.id}
                      address={item.id}
                      nameClass="max-90"
                      noNameClass="no-name"
                    />
                  );
                })}
              </>
            ) : null}
            <Tooltip
              overlayClassName="rectangle max-w-[250px]"
              placement="topRight"
              arrowPointAtCenter
              title="Multiple listings will be aggregated in the display. For auction listings, the lowest starting price will be displayed."
            >
              <img
                src={IconInfo}
                alt=""
                className="inline-block w-[15px] h-[15px] mt-[-2px]"
              />
            </Tooltip>
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
