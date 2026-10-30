import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export type PerpsHeaderMode = 'perps' | 'spot';

/**
 * Perps | Spot switch shown as the Perps page title. The Spot tab is only
 * offered when `onSelectSpot` is given (hidden outside supported regions).
 */
export const PerpsModeTabs: React.FC<{
  activeMode: PerpsHeaderMode;
  onSelectPerps?: () => void;
  onSelectSpot?: () => void;
}> = ({ activeMode, onSelectPerps, onSelectSpot }) => {
  const { t } = useTranslation();
  const options: { value: PerpsHeaderMode; label: string }[] = [
    { value: 'perps', label: t('page.perps.title') },
  ];
  if (onSelectSpot) {
    options.push({ value: 'spot', label: t('page.perpsSpot.title') });
  }

  return (
    <div className="inline-flex items-center gap-2 p-2 rounded-[8px] bg-r-neutral-card2">
      {options.map((option) => {
        const isActive = option.value === activeMode;
        return (
          <div
            key={option.value}
            data-testid={`perps-mode-${option.value}`}
            className={clsx(
              'px-12 h-[28px] flex items-center rounded-[6px] text-15 font-medium',
              isActive
                ? 'bg-r-neutral-card1 text-r-neutral-title-1 cursor-default'
                : 'text-r-neutral-foot cursor-pointer hover:text-r-neutral-title-1'
            )}
            onClick={() => {
              if (isActive) return;
              if (option.value === 'spot') {
                onSelectSpot?.();
              } else {
                onSelectPerps?.();
              }
            }}
          >
            {option.label}
          </div>
        );
      })}
    </div>
  );
};
