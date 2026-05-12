import clsx from 'clsx';
import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

export interface UnknownTagProps {
  className?: string;
}

const UnknownTag = ({ className }: UnknownTagProps) => {
  const { t } = useTranslation();

  return (
    <Tooltip
      title={t('component.UnknownTag.tooltip')}
      overlayClassName="rectangle"
      overlayInnerStyle={{
        borderRadius: '12px',
      }}
      mouseEnterDelay={0}
    >
      <span
        className={clsx(
          'inline-flex items-center justify-center whitespace-nowrap',
          'rounded-[4px] px-[4px] py-[2px]',
          'bg-rb-neutral-bg-0 text-rb-neutral-secondary',
          'text-[11px] leading-[11px] font-normal',
          'cursor-pointer',
          className
        )}
      >
        {t('component.UnknownTag.label')}
      </span>
    </Tooltip>
  );
};

export default UnknownTag;
