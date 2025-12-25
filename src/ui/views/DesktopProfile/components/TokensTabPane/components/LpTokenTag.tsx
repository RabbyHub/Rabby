import React from 'react';

import cx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RCLpTokenIconCC } from '@/ui/assets/lpToken-cc.svg';

const Overlay = ({ protocolName }: { protocolName: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex items-center gap-4">
        <RCLpTokenIconCC className="w-16 h-16 text-r-neutral-title2 cursor-pointer" />
        <div className="text-12 text-white font-semibold">
          {t('component.LpTokenTag.descriptionFor', {
            protocolName:
              protocolName?.charAt(0).toUpperCase() + protocolName?.slice(1),
          })}
        </div>
      </div>
    </div>
  );
};

export const LpTokenTag = ({
  iconClassName,
  className,
  size = 16,
  protocolName,
}: {
  iconClassName?: string;
  className?: string;
  size?: number;
  protocolName: string;
}) => {
  const { t } = useTranslation();
  return (
    <Tooltip
      overlayClassName={cx('rectangle')}
      overlayStyle={{ maxWidth: '250px' }}
      overlayInnerStyle={{
        borderRadius: '12px',
      }}
      className={className}
      style={{ width: size, height: size }}
      title={t('component.LpTokenTag.descriptionFor', {
        protocolName:
          protocolName?.charAt(0).toUpperCase() + protocolName?.slice(1),
      })}
      mouseEnterDelay={0}
    >
      <RCLpTokenIconCC
        width={size}
        height={size}
        className={cx(
          'text-rb-neutral-secondary cursor-pointer',
          iconClassName
        )}
        style={{ width: size, height: size }}
      />
    </Tooltip>
  );
};
