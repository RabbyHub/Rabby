import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import LessPalette from '@/ui/style/var-defs';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { Tooltip } from 'antd';
import {
  ExplainTxResponse,
  NFTItem,
  TransferingNFTItem,
} from 'background/service/openapi';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconWarning from 'ui/assets/icon-warning.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { NameAndAddress } from 'ui/component';

const NFTListWrapper = styled.div`
  background: rgba(134, 151, 255, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 15px 16px;
  gap: 16px;

  .type-list-nft-list {
    &-item {
      .nft-avatar {
        width: 60px;
        height: 60px;
        background-color: rgb(204, 204, 204);
        border: none;
        cursor: pointer;
      }
    }
  }
  .more {
    font-weight: 500;
    font-size: 16px;
    line-height: 19px;
    color: #4b4d59;
  }
`;

export function NFTList({
  list,
}: {
  list: NonNullable<ExplainTxResponse['type_list_nft']>['offer_list'];
}) {
  const NFTListCountLimit = 3;
  const { renderList, rest } = useMemo(() => {
    const _list = list.slice().sort((a, b) => {
      if (!a.nft?.name) {
        return 1;
      }
      if (!b.nft?.name) {
        return -1;
      }
      return a.nft?.name > b.nft?.name ? 1 : -1;
    });
    return {
      renderList: _list.slice(0, NFTListCountLimit),
      rest: _list.length - NFTListCountLimit,
    };
  }, [list]);

  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);

  if (list.length === 0) {
    return null;
  }

  if (renderList.length === 1) {
    const item = renderList[0];
    return (
      <div className="type-list-nft-card">
        <NFTAvatar
          className="nft-item-avatar"
          thumbnail
          content={item.nft?.content}
          type={item.nft?.content_type}
        />
        <div>
          <div className="type-list-nft-card-title">{item.nft?.name}</div>
          <div className="type-list-nft-card-form-item">
            <div className="type-list-nft-card-label">Collection</div>
            <div className="type-list-nft-card-value">
              {item.nft?.collection?.name || '-'}
            </div>
          </div>
          <div className="type-list-nft-card-form-item">
            <div className="type-list-nft-card-label">Contract</div>
            <div className="type-list-nft-card-value">
              <NameAndAddress
                openExternal
                className="ml-auto"
                address={item.nft.contract_id}
                nameClass="max-90"
                noNameClass="no-name"
              />
            </div>
          </div>
        </div>
      </div>
    );
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
          );
        })}
        {rest > 0 && (
          <div
            className="more truncate"
            title={`+ ${rest} ${rest > 1 ? 'NFTs' : 'NFT'}`}
          >
            + {rest} {rest > 1 ? 'NFTs' : 'NFT'}
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

const ExplainListNFTWraper = styled.div`
  padding: 16px;
  background-color: #fff;
  border-radius: 6px;

  .type-list-nft-explain {
    // border-bottom: 1px solid #e5e9ef;
    &-title {
      font-weight: 500;
      font-size: 20px;
      line-height: 23px;
      color: ${LessPalette['@color-title']};
      margin-bottom: 16px;
      .name-and-address {
        display: inline-flex;
        margin-right: 6px;
        .address {
          font-weight: 500;
          font-size: 13px;
          line-height: 15px;
          color: ${LessPalette['@color-comment-1']};
        }
        img {
          width: 14px !important;
          height: 14px !important;
        }
      }
      strong {
        font-weight: 500;
        color: ${LessPalette['@color-title']};
        word-break: break-all;
      }
    }
    .type-list-nft-card {
      display: flex;
      background: rgba(134, 151, 255, 0.1);
      border-radius: 4px;
      align-items: center;
      padding: 15px;
      gap: 12px;

      &-title {
        font-weight: 500;
        font-size: 15px;
        line-height: 18px;
        margin-bottom: 8px;
      }

      &-form-item {
        display: flex;
        align-items: center;
        gap: 12px;
        &:not(:last-child) {
          margin-bottom: 8px;
        }
      }
      &-label {
        font-weight: 400;
        font-size: 12px;
        line-height: 14px;
        color: ${LessPalette['@color-comment-1']};
        width: 54px;
      }
      &-value,
      .address {
        font-weight: 500;
        font-size: 12px;
        line-height: 14px;
        color: ${LessPalette['@color-body']} !important;
      }
    }
    &-list {
      margin-top: 24px;
      &-item {
        display: flex;
        align-items: center;
        gap: 16px;
        &:not(:last-child) {
          margin-bottom: 16px;
        }

        &-label {
          font-weight: 400;
          font-size: 14px;
          line-height: 16px;
          color: ${LessPalette['@color-body']};
        }
        &-value {
          margin-left: auto;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          color: ${LessPalette['@color-title']};
          .list-on-address {
            .address {
              font-weight: 400;
              font-size: 14px;
              line-height: 16px;
              color: ${LessPalette['@color-comment-1']} !important;
            }
          }
          .buyer-address {
            .address {
              font-weight: 500;
              font-size: 14px;
              line-height: 16px;
              text-align: right;
              color: ${LessPalette['@color-title']} !important;
            }
          }
        }
      }
    }
  }
`;
interface ExplainListNFTProps {
  detail: NonNullable<ExplainTxResponse['type_list_nft']>;
}

export const ExplainListNFT = ({ detail }: ExplainListNFTProps) => {
  const { t } = useTranslation();

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
    <ExplainListNFTWraper>
      <div className="type-list-nft-explain-title">
        List {totalNFTAmount} NFT{totalNFTAmount > 1 ? 's' : ''} For Sale
      </div>
      <NFTList list={detail?.offer_list || []}></NFTList>
      <div className="type-list-nft-explain-list">
        <div className="type-list-nft-explain-list-item">
          <div className="type-list-nft-explain-list-item-label">List on</div>
          <div className="type-list-nft-explain-list-item-value flex items-center gap-[6px]">
            <img
              src={detail.contract_protocol_logo_url || IconUnknownProtocol}
              className="w-[16px] h-[16px] rounded-full"
              onError={handleProtocolLogoLoadFailed}
            />
            <span>
              {detail.contract_protocol_name || t('Unknown Protocol')}
            </span>
            <NameAndAddress
              className="list-on-address ml-auto"
              address={detail.contract}
              nameClass="max-90"
              noNameClass="no-name"
              openExternal
            />
          </div>
        </div>
        <div className="type-list-nft-explain-list-item">
          <div className="type-list-nft-explain-list-item-label">
            Est. total listing price in USD
          </div>
          <div className="type-list-nft-explain-list-item-value flex items-center">
            ${new BigNumber(detail.total_usd_value || 0).toFormat(2)}
          </div>
        </div>
        {detail.buyer_list?.length ? (
          <div className="type-list-nft-explain-list-item">
            <div className="type-list-nft-explain-list-item-label flex items-center gap-[6px]">
              Specific buyer{' '}
              <Tooltip
                title="The listing is reserved for the specific buyer. Please be cautious of scams. "
                placement="top"
                overlayClassName={clsx('rectangle', 'max-w-[250px]')}
              >
                <img src={IconWarning} className="w-[16px] h-[16px]" alt="" />
              </Tooltip>
            </div>
            <div className="type-list-nft-explain-list-item-value flex items-center flex-wrap gap-[6px]">
              {detail.buyer_list?.map((item) => {
                return (
                  <NameAndAddress
                    key={item.id}
                    address={item.id}
                    className="buyer-address"
                    nameClass="max-90"
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </ExplainListNFTWraper>
  );
};
