import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import IconPendingTx from 'ui/assets/dashboard/pending-tx.svg';

const Wrapper = styled.div`
  position: absolute;
  padding: 6px 9px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  display: flex;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  color: #fff;
  top: 86px;
  right: 20px;
  cursor: pointer;
  user-select: none;
`;

const IconPendingTxElement = styled.img`
  @keyframes icn-spin {
    100% {
      transform: rotate(360deg);
    }
  }
  width: 15px;
  height: 15px;
  margin-right: 4px;
  animation: icn-spin 1.5s linear infinite;
`;

interface Props {
  pendingTxCount: number;
}

const PendingTxs = ({ pendingTxCount }: Props) => {
  const history = useHistory();

  const handleClickPendingTxs = () => {
    history.push('/activities');
  };

  return (
    <Wrapper onClick={handleClickPendingTxs}>
      <IconPendingTxElement src={IconPendingTx} />
      {`${pendingTxCount > 99 ? '99+' : pendingTxCount} Pending${
        pendingTxCount > 1 ? 's' : ''
      }`}
    </Wrapper>
  );
};

export default PendingTxs;
