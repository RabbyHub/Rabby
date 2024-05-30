import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import {
  NFTItem,
  TransferingNFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import styled from 'styled-components';
import { TokenLabel } from './Values';
import clsx from 'clsx';

const Wrapper = styled.div`
  display: flex;
  align-items: center;

  .nft-item-avatar {
    margin-right: 6px;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    border: none;
    .ant-image {
      img {
        border-radius: 2px;
      }
    }
    .nft-avatar-cover img {
      display: none !important;
    }
  }
  .name {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #192945);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const NFTWithName = ({
  nft,
  textStyle,
  showTokenLabel = false,
  id,
  hasHover,
}: {
  nft: NFTItem;
  textStyle?: React.CSSProperties;
  showTokenLabel?: boolean;
  id?: string;
  hasHover?: boolean;
}) => {
  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);
  return (
    <>
      <Wrapper>
        <NFTAvatar
          onPreview={(e) => {
            e.stopPropagation();
            setFocusingNFT(nft);
          }}
          className="nft-item-avatar"
          thumbnail
          content={nft?.content}
          type={nft?.content_type}
        />
        <div
          id={id}
          style={textStyle}
          className={clsx('name', {
            'flex-1': !showTokenLabel,
            'cursor-pointer group-hover:underline hover:text-r-blue-default': hasHover,
          })}
          title={nft?.name || '-'}
        >
          {showTokenLabel
            ? ellipsisTokenSymbol(nft?.name || '-', 15)
            : nft?.name || '-'}
        </div>
        {showTokenLabel && (
          <div className="ml-4">
            <TokenLabel
              isFake={nft.collection?.is_verified === false}
              isScam={
                nft.collection?.is_verified === false
                  ? false
                  : !!nft.collection?.is_suspicious
              }
            />
          </div>
        )}
      </Wrapper>
      {focusingNFT && (
        <ModalPreviewNFTItem
          nft={(focusingNFT as unknown) as TransferingNFTItem}
          onCancel={(e) => {
            e.stopPropagation();
            setFocusingNFT(null);
          }}
        />
      )}
    </>
  );
};

export default NFTWithName;
