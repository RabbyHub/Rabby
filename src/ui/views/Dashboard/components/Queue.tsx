import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
  box-sizing: border-box;
  min-width: 54px;
  height: 22px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  opacity: 0.6;
  cursor: pointer;

  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #ffffff;

  &:hover {
    opacity: 1;
    background: rgba(255, 255, 255, 0.1);
  }
`;

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
    <Wrapper
      onClick={handleClickPendingTxs}
      className={clsx(
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
    </Wrapper>
  );
};

export default Queue;
