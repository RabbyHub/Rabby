import { ExplainListNFT } from '@/ui/component/ExplainListNFT';
import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
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
import styled from 'styled-components';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconUnknownProtocol from 'ui/assets/unknown-protocol.svg';
import { NameAndAddress } from 'ui/component';
import SpeedUpCorner from './SpeedUpCorner';
import ViewRawModal from './ViewRawModal';

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
        <div className="common-detail-block h-0 p-0 min-h-0">
          {isSpeedUp && <SpeedUpCorner />}
        </div>
        <ExplainListNFT detail={detail} />
      </div>
    </div>
  );
};

export default ListNFT;
