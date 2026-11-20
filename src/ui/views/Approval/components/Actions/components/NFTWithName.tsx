import ModalPreviewNFTItem from '@/ui/component/ModalPreviewNFTItem';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import {
  NFTItem,
  TransferingNFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import React from 'react';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { TokenLabel } from './Values';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';
import styles from './NFTWithName.module.css';

const NFTWithName = ({
  nft,
  textStyle,
  showTokenLabel = false,
  id,
  hasHover,
  className,
}: {
  nft: NFTItem;
  textStyle?: React.CSSProperties;
  showTokenLabel?: boolean;
  id?: string;
  hasHover?: boolean;
  className?: string;
}) => {
  const [focusingNFT, setFocusingNFT] = React.useState<NFTItem | null>(null);
  return (
    <>
      <div className={cn(styles.wrapper, className)}>
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
            'cursor-pointer hover:underline hover:text-r-blue-default': hasHover,
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
      </div>
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
