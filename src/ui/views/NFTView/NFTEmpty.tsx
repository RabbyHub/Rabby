import React from 'react';
import { ReactComponent as EmptyNFTListSVG } from '@/ui/assets/nft-view/empty-nft-list.svg';
import { ReactComponent as EmptyNFTStarredListSVG } from '@/ui/assets/nft-view/empty-nft-starred-list.svg';
import { useTranslation } from 'react-i18next';

export interface Props {
  Icon: React.ReactNode;
  title?: string;
  description?: string;
}

export const NFTEmpty: React.FC<Props> = ({ Icon, title, description }) => {
  return (
    <div className="mt-[110px] flex flex-col text-center">
      {Icon}
      <div className="mt-[16px] text-black text-15 font-medium text-center">
        {title}
      </div>
      {description && (
        <div className="mt-[8px] text-black text-13 text-center">
          {description}
        </div>
      )}
    </div>
  );
};

export const NFTListEmpty = () => {
  const { t } = useTranslation();
  return (
    <NFTEmpty
      Icon={<EmptyNFTListSVG className="mx-auto" />}
      title={t('page.nft.noNft')}
    />
  );
};

export const NFTStarredListEmpty = () => {
  const { t } = useTranslation();

  return (
    <NFTEmpty
      Icon={<EmptyNFTStarredListSVG className="mx-auto" />}
      title={t('page.nft.empty.title')}
      description={t('page.nft.empty.description')}
    />
  );
};
