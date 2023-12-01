import React from 'react';
import { ReactComponent as RcEmptyNFTList } from '@/ui/assets/nft-view/empty-nft-list.svg';
import { ReactComponent as RcEmptyNFTListDark } from '@/ui/assets/nft-view/empty-nft-list-dark.svg';
import { ReactComponent as RcEmptyNFTStarredList } from '@/ui/assets/nft-view/empty-nft-starred-list.svg';
import { ReactComponent as RcEmptyNFTStarredListDark } from '@/ui/assets/nft-view/empty-nft-starred-list-dark.svg';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/ui/hooks/usePreference';

export interface Props {
  Icon: React.ReactNode;
  title?: string;
  description?: string;
}

export const NFTEmpty: React.FC<Props> = ({ Icon, title, description }) => {
  return (
    <div className="mt-[110px] flex flex-col text-center">
      {Icon}
      <div className="mt-[16px] text-r-neutral-body text-15 font-medium text-center">
        {title}
      </div>
      {description && (
        <div className="mt-[8px] text-r-neutral-body text-13 text-center">
          {description}
        </div>
      )}
    </div>
  );
};

export const NFTListEmpty = () => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  return (
    <NFTEmpty
      Icon={
        isDarkTheme ? (
          <RcEmptyNFTListDark className="mx-auto" />
        ) : (
          <RcEmptyNFTList className="mx-auto" />
        )
      }
      title={t('page.nft.noNft')}
    />
  );
};

export const NFTStarredListEmpty = () => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  return (
    <NFTEmpty
      Icon={
        isDarkTheme ? (
          <RcEmptyNFTStarredListDark className="mx-auto" />
        ) : (
          <RcEmptyNFTStarredList className="mx-auto" />
        )
      }
      title={t('page.nft.empty.title')}
      description={t('page.nft.empty.description')}
    />
  );
};
