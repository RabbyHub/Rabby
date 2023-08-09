import React from 'react';
import styled from 'styled-components';
import { useHistory } from 'react-router-dom';
import IconPendingTx from 'ui/assets/dashboard/pending-tx.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
  position: absolute;
  padding: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  color: #fff;
  top: 70px;
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
  const { t } = useTranslation();
  const countStr = pendingTxCount > 99 ? '99+' : pendingTxCount.toString();
  return (
    <Wrapper
      className={clsx(
        'group max-w-[62px] hover:max-w-[200px]',
        'transition-all ease-in-out',
        'whitespace-nowrap overflow-hidden overflow-ellipsis'
      )}
      onClick={handleClickPendingTxs}
    >
      <div className="group-hover:hidden flex relative">
        <IconPendingTxElement
          className="w-[20px] h-[20px] mr-0"
          src={IconPendingTx}
        />
        <span className="absolute inset-0 leading-[20px] text-center">
          {pendingTxCount > 99 ? '99+' : pendingTxCount}
        </span>
      </div>
      <div className="group-hover:flex hidden px-[10px] py-[2px]">
        <IconPendingTxElement src={IconPendingTx} />
        <span>
          {pendingTxCount > 1
            ? t('page.dashboard.home.pendingCountPlural', {
                countStr,
              })
            : t('page.dashboard.home.pendingCount')}
        </span>
      </div>
    </Wrapper>
  );
};

export default PendingTxs;
