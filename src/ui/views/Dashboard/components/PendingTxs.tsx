import React from 'react';
import { useHistory } from 'react-router-dom';
import IconPendingTx from 'ui/assets/dashboard/pending-tx.svg';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styles from './PendingTxs.module.css';

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
    <div
      className={clsx(
        'box-border w-[22px] h-[22px] p-[3px] rounded-[4px] bg-[rgba(255,255,255,0.2)]',
        'font-medium text-[10px] leading-[12px] text-white cursor-pointer select-none',
        'transition-all ease-in-out',
        'whitespace-nowrap overflow-hidden text-ellipsis'
      )}
      onClick={handleClickPendingTxs}
    >
      <div className="flex relative">
        <img className={styles.iconPendingTx} src={IconPendingTx} />
        <span className="absolute inset-0 leading-[16px] text-center">
          {countStr}
        </span>
      </div>
    </div>
  );
};

export default PendingTxs;
