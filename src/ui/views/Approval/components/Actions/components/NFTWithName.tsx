import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTItem, TransferingNFTItem } from '@debank/rabby-api/dist/types';
import React, { ReactNode } from 'react';
import styled from 'styled-components';
import IconUnknown from 'ui/assets/token-default.svg';

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
    font-size: 12px;
    line-height: 14px;
    color: #333333;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const NFTWithName = ({ nft }: { nft: NFTItem }) => {
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
        <div className="name">{nft?.name || '-'}</div>
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
