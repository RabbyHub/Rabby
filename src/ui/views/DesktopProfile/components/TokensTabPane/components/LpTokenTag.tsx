import React from 'react';

import cx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RCLpTokenIconCC } from '@/ui/assets/lpToken-cc.svg';

const Overlay = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8 py-6">
      <div className="flex items-center gap-4">
        <RCLpTokenIconCC className="w-16 h-16 text-rb-neutral-secondary cursor-pointer" />
        <div className="text-12 text-white font-semibold">
          {t('component.LpTokenTag.title')}
        </div>
      </div>
      <div className="text-12 text-rb-neutral-info">
        {t('component.LpTokenTag.description')}
      </div>
    </div>
  );
};

export const LpTokenTag = ({ className }: { className?: string }) => {
  return (
    <Tooltip
      overlayClassName={cx('rectangle addressType__tooltip')}
      overlayStyle={{ maxWidth: '280px' }}
      overlayInnerStyle={{
        borderRadius: '12px',
      }}
      className={cx('w-16 h-16', className)}
      overlay={<Overlay />}
      mouseEnterDelay={0}
    >
      <RCLpTokenIconCC className="w-16 h-16 text-rb-neutral-secondary cursor-pointer" />
    </Tooltip>
  );
};
