import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import clsx from 'clsx';

const Wrapper = styled.div`
  position: absolute;
  top: 70px;
  right: 20px;
  min-width: 62px;
  height: 27px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;

  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  color: #ffffff;
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

  return (
    <Wrapper
      onClick={handleClickPendingTxs}
      className={clsx(
        className,
        'ease-in-out',
        'group max-w-[62px] hover:max-w-[200px]',
        'whitespace-nowrap overflow-hidden overflow-ellipsis',
        'flex justify-end'
      )}
    >
      <div className="group-hover:block hidden">
        {count ? <span className="mr-4">{count} in</span> : null}
      </div>
      <div>Queue</div>
    </Wrapper>
  );
};

export default Queue;
