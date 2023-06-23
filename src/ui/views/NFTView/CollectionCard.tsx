import clsx from 'clsx';
import React from 'react';
import { ReactComponent as StarSVG } from '@/ui/assets/nft-view/star.svg';
import { ReactComponent as StarredSVG } from '@/ui/assets/nft-view/starred.svg';
import { UserCollection } from '@rabby-wallet/rabby-api/dist/types';

export interface Props {
  collection: UserCollection;
  className?: string;
  onClickNFT?: () => void;
}

export const CollectionCard: React.FC<Props> = ({
  collection,
  className,
  onClickNFT,
}) => {
  const onStar = React.useCallback(() => {
    console.log('star');
  }, []);

  return (
    <div className={clsx('p-12 rounded-[6px] bg-white', className)}>
      <section
        className={clsx(
          'border-b-[0.5px] border-gray-divider space-y-6',
          'mb-10 pb-10',
          'relative'
        )}
      >
        <div className="space-x-4">
          <span className="text-15 text-gray-title font-medium">
            {collection.collection.name}
          </span>
          <span className="text-13 text-black">({collection.list.length})</span>
        </div>
        <div className="gap-x-4 flex">
          <img className="w-[14px] h-[14px] rounded-full" />
          <span className="text-black text-12">
            {collection.list[0].chain} / Floor Price:{' '}
            {collection.collection.floor_price} ETH
          </span>
        </div>

        <div
          className={clsx(
            'absolute right-0 top-0 cursor-pointer',
            'hover:opacity-60'
          )}
          onClick={onStar}
        >
          <StarSVG />
        </div>
      </section>
      <section className="grid grid-cols-5 gap-10">
        {collection.list.map((item, index) => {
          <div
            key={item.id}
            className="rounded w-full h-[59px] cursor-pointer"
            onClick={() => onClickNFT?.()}
          >
            img
          </div>;
        })}
      </section>
    </div>
  );
};
