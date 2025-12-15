import { RcIconRefreshCC } from '@/ui/assets/desktop/profile';
import { formatTimeReadable } from '@/ui/utils';
import { useInterval, useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

export const UpdateButton: React.FC<{
  updatedAt?: number;
  isUpdating?: boolean;
  onUpdate?(): void;
}> = ({ isUpdating, updatedAt, onUpdate }) => {
  const handleClick = useMemoizedFn(() => {
    if (isUpdating) {
      return;
    }
    onUpdate?.();
  });
  const { t } = useTranslation();
  const [elapseSecs, setElapseSecs] = useState(
    Math.ceil(Date.now() - (updatedAt || 0))
  );

  useInterval(() => {
    setElapseSecs(Math.ceil(Date.now() - (updatedAt || 0)));
  }, 1000);

  const timeText = useMemo(
    () =>
      Number.isFinite(elapseSecs) ? formatTimeReadable(elapseSecs / 1000) : '',
    [elapseSecs]
  );

  return (
    <div className="flex items-center gap-[4px]">
      {isUpdating ? (
        <div className="text-rb-neutral-secondary text-[13px] leading-[16px]">
          {t('page.desktopProfile.UpdateButton.updating')}
        </div>
      ) : updatedAt && elapseSecs ? (
        <div className="text-rb-neutral-secondary text-[13px] leading-[16px]">
          <Trans
            t={t}
            i18nKey="page.desktopProfile.UpdateButton.updatedAgo"
            values={{
              timeText,
            }}
          >
            Data updated{' '}
            <span className="text-r-neutral-title1 font-medium">
              {timeText}
            </span>{' '}
            ago
          </Trans>
        </div>
      ) : null}
      <RcIconRefreshCC
        onClick={handleClick}
        className={clsx(
          'cursor-pointer text-rb-neutral-secondary',
          'hover:text-r-blue-default',
          isUpdating ? 'animate-spin' : ''
        )}
      />
    </div>
  );
};
