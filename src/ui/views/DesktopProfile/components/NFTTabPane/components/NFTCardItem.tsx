import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { findChain } from '@/utils/chain';
import { CollectionList, NFTItem } from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import React from 'react';

export const NFTCardItem: React.FC<{
  item: {
    nft: NFTItem;
    collection: Omit<CollectionList, 'nft_list'>;
  };
  onClick: () => void;
}> = ({ item, onClick }) => {
  const chain = findChain({ serverId: item.nft.chain });

  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-[8px] border-[1px] border-solid border-rb-neutral-line p-[2px]',
        'hover:border-rabby-blue-default cursor-pointer',
        'w-[204px]'
      )}
    >
      <div className="relative">
        <NFTAvatar
          className="w-[198px] h-[198px] rounded-[4px]"
          type={item.nft.content_type}
          // amount={item.nft.amount}
          content={item.nft.content}
        />
        <img
          src={chain?.logo}
          alt="chain"
          className={clsx(
            'absolute top-[8px] left-[8px]',
            'w-[24px] h-[24px] rounded-full',
            'border-[1px] border-solid border-white'
          )}
        />
        {item.nft.amount > 1 ? (
          <div
            className={clsx(
              'absolute top-[8px] right-[8px]',
              'rounded-[4px] py-[3px] px-[10px]',
              'text-r-neutral-title2 font-medium text-[15px] leading-[18px]',
              'bg-[rgba(0,0,0,0.5)]'
            )}
          >
            x{item.nft.amount}
          </div>
        ) : null}
      </div>
      <div
        className={clsx(
          'pt-[8px] px-[4px] pb-[12px]',
          'text-[15px] leading-[18px] font-medium text-rb-neutral-title-1 truncate'
        )}
      >
        {item.nft.name}
      </div>
    </div>
  );
};
