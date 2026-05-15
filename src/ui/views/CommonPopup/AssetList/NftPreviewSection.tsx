import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import omit from 'lodash/omit';
import { Skeleton } from 'antd';

import { CollectionList, NFTItem } from '@rabby-wallet/rabby-api/dist/types';

import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useNFTCollections } from '@/ui/hooks/useNFTCollections';
import { useWallet } from '@/ui/utils';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import NftEmptyState from '@/ui/assets/dashboard/nft-empty-state.svg';
import { ReactComponent as RcIconJump } from 'ui/assets/tokenDetail/IconJump.svg';

interface Props {
  className?: string;
  onOpenInTab?(): void;
}

export const NftPreviewSection: React.FC<Props> = ({
  className,
  onOpenInTab,
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const { collections, isLoading } = useNFTCollections(
    currentAccount?.address,
    {
      preferCacheOnExists: true,
    }
  );

  const list = React.useMemo(() => {
    const result: {
      nft: NFTItem;
      collection: Omit<CollectionList, 'nft_list'>;
    }[] = [];

    collections
      .filter((collection) => {
        return !collection.is_hidden && collection.is_core;
      })
      .forEach((collection) => {
        const baseCollection = omit(collection, 'nft_list');
        collection.nft_list.forEach((nft) => {
          result.push({
            nft,
            collection: baseCollection,
          });
        });
      });

    return result.sort(
      (a, b) =>
        (b?.collection?.credit_score || 0) - (a?.collection?.credit_score || 0)
    );
  }, [collections]);

  const handleOpenInTab = () => {
    if (onOpenInTab) {
      onOpenInTab();
      return;
    }

    wallet.openInDesktop('/desktop/profile/nft');
    window.close();
  };

  return (
    <div className={className} onClick={handleOpenInTab}>
      {isLoading ? (
        <Skeleton.Input className="w-full h-[48px] rounded-[4px]" active />
      ) : (
        <div
          className={clsx(
            'bg-r-neutral-card1 rounded-[8px] p-[12px] overflow-hidden border border-transparent',
            'hover:border-rb-blue-default cursor-pointer'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[8px] min-w-0 text-[15px] leading-[18px]">
              <div className="text-r-neutral-title-1 font-semibold">
                {t('page.dashboard.home.panel.nft')}
              </div>
              <div className="text-r-neutral-foot font-medium">
                ({list.length})
              </div>
            </div>
            <button
              type="button"
              className={clsx(
                'w-[16px] h-[16px] shrink-0 p-0 border-0 bg-transparent',
                'flex items-center justify-center text-r-neutral-title-1',
                'opacity-80 hover:opacity-100 transition-opacity'
              )}
              aria-label={t('page.dashboard.assets.openInTabV2')}
            >
              <RcIconJump className="w-[14px] h-[14px]" />
            </button>
          </div>
          {list.length ? (
            <div className="mt-[8px] overflow-hidden">
              <div className="flex w-max items-center gap-[4px]">
                {list.slice(0, 7).map((item) => {
                  return (
                    <div
                      key={`${item.collection.chain}-${item.collection.id}-${item.nft.id}`}
                      className="w-[48px] h-[48px] shrink-0 rounded-[4px] overflow-hidden bg-r-neutral-line"
                    >
                      <NFTAvatar
                        className="w-[48px] h-[48px]"
                        type={item.nft?.content_type}
                        content={item.nft?.content}
                        empty={
                          <div className="w-[48px] h-[48px] rounded-[4px] bg-r-neutral-line" />
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
