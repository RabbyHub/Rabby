import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { LimitOrderType } from '../../../types';
import { PerpsDropdown, PERPS_DROPDOWN_TRIGGER_CLASS } from './PerpsDropdown';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';

interface LimitOrderTypeSelectorProps {
  value: LimitOrderType;
  onChange: (value: LimitOrderType) => void;
}

const OPTIONS = [
  { label: 'GTC', value: 'Gtc' as LimitOrderType, titleKey: 'Gtc' },
  { label: 'IOC', value: 'Ioc' as LimitOrderType, titleKey: 'Ioc' },
  { label: 'ALO', value: 'Alo' as LimitOrderType, titleKey: 'Alo' },
];

export const LimitOrderTypeSelector: React.FC<LimitOrderTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  const options = OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    title: t(
      `page.perpsPro.tradingPanel.limitOrderTypeOptions.${opt.titleKey}`
    ), // for hover tooltip
  }));

  return (
    <div
      className={clsx(
        'flex items-center gap-[3px] text-12 text-rb-neutral-secondary'
      )}
    >
      TIF
      <PerpsDropdown
        options={options}
        onSelect={(key) => onChange(key as LimitOrderType)}
      >
        <div className={PERPS_DROPDOWN_TRIGGER_CLASS}>
          {OPTIONS.find((opt) => opt.value === value)?.label}
          <RcIconArrowDownCC
            viewBox="0 0 16 16"
            className="w-[14px] h-[14px] text-rb-neutral-secondary"
          />
        </div>
      </PerpsDropdown>
    </div>
  );
};
