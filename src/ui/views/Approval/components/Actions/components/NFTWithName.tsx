import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTItem, TransferingNFTItem } from '@debank/rabby-api/dist/types';
import React, { ReactNode } from 'react';
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
    width: 18px;
    height: 18px;
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
    color: #333333;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
  }
`;

const NFTWithName = ({
  nft,
  textStyle,
  showTokenLabel = false,
}: {
  nft: NFTItem;
  textStyle?: React.CSSProperties;
  showTokenLabel?: boolean;
}) => {
  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);
  return (
    <>
      <Wrapper>
        <NFTAvatar
          onPreview={() => setFocusingNFT(nft)}
          className="nft-item-avatar"
          thumbnail
          content={nft?.content}
          type={nft?.content_type}
        />
        <div
          style={textStyle}
          className={clsx('name', {
            'flex-1': !showTokenLabel,
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
          onCancel={() => setFocusingNFT(null)}
        />
      )}
    </>
  );
};

export default NFTWithName;
