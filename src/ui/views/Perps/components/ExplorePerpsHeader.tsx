import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconSearchCC } from '@/ui/assets/perps/IconSearchCC.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import clsx from 'clsx';

interface ExplorePerpsHeaderProps {
  onSearchClick: () => void;
  className?: string;
}

export const ExplorePerpsHeader = React.forwardRef<
  HTMLDivElement,
  ExplorePerpsHeaderProps
>(({ onSearchClick, className }, ref) => {
  const { t } = useTranslation();

  return (
    <div
      ref={ref}
      className={clsx('sticky top-0 z-10 bg-r-neutral-bg2 pb-12', className)}
    >
      <div className="flex justify-between">
        <div className="text-13 font-medium text-r-neutral-title-1">
          {t('page.perps.explorePerps')}
        </div>
        <div className="cursor-pointer px-2" onClick={onSearchClick}>
          <ThemeIcon className="icon text-r-neutral-body" src={IconSearchCC} />
        </div>
      </div>
    </div>
  );
});
