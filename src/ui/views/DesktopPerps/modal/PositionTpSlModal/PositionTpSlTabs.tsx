import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TpSlScope } from '../../positionTpSl';

export const PositionTpSlTabs: React.FC<{
  value: TpSlScope;
  onChange: (value: TpSlScope) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const { t } = useTranslation();
  const tabs: { key: TpSlScope; label: string }[] = [
    { key: 'partial', label: t('page.perpsPro.positionTpSl.tabPartial') },
    { key: 'position', label: t('page.perpsPro.positionTpSl.tabPosition') },
  ];

  return (
    // 32px tall like Figma (31px tabs + 1px divider): Figma's stroke doesn't
    // take layout, so its 1px bottom padding *is* the divider here.
    <div className="flex items-end gap-[12px] border-b border-solid border-rb-neutral-bg-5 px-[16px]">
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            disabled={disabled}
            className={clsx(
              'relative border-0 bg-transparent px-[2px] py-[6px] text-[16px] leading-[19px] font-medium disabled:cursor-not-allowed',
              active
                ? 'text-rb-neutral-title-1'
                : 'text-rb-neutral-secondary hover:text-rb-neutral-title-1'
            )}
            onClick={() => {
              if (!active) onChange(tab.key);
            }}
          >
            {tab.label}
            {active ? (
              // Text-wide 2px bar centred on the tab's bottom edge, overlapping
              // the divider like Figma's (164431:142374).
              <span className="absolute bottom-[-1px] left-[2px] right-[2px] h-[2px] bg-rb-neutral-body" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
