import React from 'react';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface QueueProps {
  count?: number;
  className?: string;
}

const Queue = ({ count, className }: QueueProps) => {
  const history = useHistory();

  const handleClickPendingTxs = () => {
    history.push('/gnosis-queue');
  };
  const { t } = useTranslation();

  return (
    <div
      onClick={handleClickPendingTxs}
      className={clsx(
        'box-border min-w-[54px] h-[22px] py-4 px-8 rounded-[4px] cursor-pointer',
        'bg-[rgba(255,255,255,0.2)] opacity-60',
        'hover:opacity-100 hover:bg-[rgba(255,255,255,0.1)]',
        'font-normal text-[12px] leading-[14px] text-white',
        className,
        'ease-in-out',
        'group',
        'whitespace-nowrap overflow-hidden text-ellipsis',
        'flex items-center justify-center'
      )}
    >
      <div className="group-hover:block hidden">
        {count ? (
          <span className="mr-4">
            {t('page.dashboard.home.queue.count', { count })}
          </span>
        ) : null}
      </div>
      <div>{t('page.dashboard.home.queue.title')}</div>
    </div>
  );
};

export default Queue;
