import { RcIconRefreshCC } from '@/ui/assets/desktop/profile';
import { formatTimeReadable } from '@/ui/utils';
import { useInterval, useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';

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
        <div className="text-r-neutral-foot text-[13px] leading-[16px]">
          Updating data
        </div>
      ) : updatedAt && elapseSecs ? (
        <div className="text-r-neutral-foot text-[13px] leading-[16px]">
          Data updated{' '}
          <span className="text-r-neutral-title1 font-medium">{timeText}</span>{' '}
          ago
        </div>
      ) : null}
      <RcIconRefreshCC
        onClick={handleClick}
        className={clsx(
          'cursor-pointer text-r-neutral-foot',
          'hover:text-r-blue-default',
          isUpdating ? 'animate-spin' : ''
        )}
      />
    </div>
  );
};
