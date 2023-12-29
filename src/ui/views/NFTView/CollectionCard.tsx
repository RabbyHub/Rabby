import clsx from 'clsx';
import React from 'react';
import { ReactComponent as StarSVG } from '@/ui/assets/nft-view/star.svg';
import { ReactComponent as StarredSVG } from '@/ui/assets/nft-view/starred.svg';
import { NFTItem, CollectionList } from '@rabby-wallet/rabby-api/dist/types';
import NFTAvatar from '../Dashboard/components/NFT/NFTAvatar';
import { ChainIcon, getChainName } from './ChainIcon';
import { useTranslation } from 'react-i18next';

export interface Props {
  collection: CollectionList;
  className?: string;
  onClickNFT?: (nft: NFTItem, name: string) => void;
  onStar?: () => void;
  isStarred?: boolean;
}

export const CollectionCard: React.FC<Props> = ({
  collection,
  className,
  onClickNFT,
  onStar,
  isStarred,
}) => {
  const { t } = useTranslation();
  const chain = collection.nft_list[0].chain;
  const chainName = getChainName(chain);
  return (
    <div
      className={clsx(
        'p-12 rounded-[6px] bg-r-neutral-card-1 relative',
        className
      )}
    >
      <section
        className={clsx(
          'border-b-[0.5px] border-b-r-neutral-line',
          'mb-10 pb-10'
        )}
      >
        <div className="space-x-4 flex items-center mr-28">
          <span
            className={clsx(
              'block text-15 text-r-neutral-title-1 font-medium leading-[18px]',
              'truncate'
            )}
            title={collection.name}
          >
            {collection.name}
          </span>
          <span className="block text-13 text-r-neutral-foot leading-[18px] -mt-1">
            ({collection.nft_list.length})
          </span>
        </div>
        <div className="gap-x-4 flex mt-6">
          <ChainIcon chain={chain} />
          <div className="text-r-neutral-foot text-12">
            <span>{chainName}</span>
            {collection.floor_price !== 0 ? (
              <>
                {' '}
                <span>
                  {t('page.nft.floorPrice')} {collection.floor_price}
                </span>{' '}
                <span>{collection.native_token?.symbol}</span>
              </>
            ) : null}
          </div>
        </div>

        <div
          className={clsx(
            'absolute right-0 top-0 cursor-pointer',
            'hover:opacity-60',
            'w-[40px] h-[40px]',
            'flex items-center justify-center'
          )}
          onClick={onStar}
        >
          {isStarred ? <StarredSVG /> : <StarSVG />}
        </div>
      </section>
      <section className="grid grid-cols-5 gap-10">
        {collection.nft_list.map((item) => (
          <div
            key={item.id}
            className="rounded w-full h-[59px] cursor-pointer overflow-hidden"
          >
            <NFTAvatar
              className="h-[59px] w-[59px]"
              onPreview={() => onClickNFT?.(item, collection.name)}
              type={item.content_type}
              amount={item.amount}
              content={item.content}
              key={item.id}
            />
          </div>
        ))}
      </section>
    </div>
  );
};
