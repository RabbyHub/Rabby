import React from 'react';
import { ReactComponent as IconCategoryArrowCC } from '@/ui/assets/perps/IconCategoryArrowCC.svg';
import { ReactComponent as IconCategorySearchCC } from '@/ui/assets/perps/IconCategorySearchCC.svg';
import { PerpsCategoryConfig } from '../constants/perpsCategories';

interface PerpsCategorySectionHeaderProps {
  cfg: PerpsCategoryConfig;
  onSearchClick: () => void;
}

export const PerpsCategorySectionHeader: React.FC<PerpsCategorySectionHeaderProps> = ({
  cfg,
  onSearchClick,
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div
        className="flex items-center justify-center gap-8 cursor-pointer"
        onClick={onSearchClick}
      >
        <span className="text-15 font-semibold text-r-neutral-title-1">
          {cfg.label}
        </span>
        <IconCategoryArrowCC className="w-16 h-16 text-r-neutral-title-1" />
      </div>
      <div
        className="cursor-pointer relative hit-slop-8"
        onClick={onSearchClick}
      >
        <IconCategorySearchCC className="w-16 h-16 text-r-neutral-body" />
      </div>
    </div>
  );
};
