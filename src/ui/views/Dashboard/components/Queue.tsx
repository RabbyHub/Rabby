import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';

const Wrapper = styled.div`
  position: absolute;
  top: 86px;
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
    <Wrapper onClick={handleClickPendingTxs} className={className}>
      {count ? `${count} in Queue` : 'Queue'}
    </Wrapper>
  );
};

export default Queue;
