import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import IconPendingTx from 'ui/assets/dashboard/pending-tx.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
  box-sizing: border-box;
  width: 22px;
  height: 22px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: 500;
  font-size: 10px;
  line-height: 12px;
  color: #fff;
  cursor: pointer;
  user-select: none;
`;

const IconPendingTxElement = styled.img`
  @keyframes icn-spin {
    100% {
      transform: rotate(360deg);
    }
  }
  width: 16px;
  height: 16px;
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
  const { t } = useTranslation();
  const countStr = pendingTxCount > 99 ? '99+' : pendingTxCount.toString();
  return (
    <Wrapper
      className={clsx(
        'transition-all ease-in-out',
        'whitespace-nowrap overflow-hidden text-ellipsis'
      )}
      onClick={handleClickPendingTxs}
    >
      <div className="flex relative">
        <IconPendingTxElement src={IconPendingTx} />
        <span className="absolute inset-0 leading-[16px] text-center">
          {countStr}
        </span>
      </div>
    </Wrapper>
  );
};

export default PendingTxs;
