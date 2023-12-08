import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CANCEL_TX_TYPE } from '@/constant';
import { Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const OptionsList = styled.div`
  .option-item {
    display: flex;
    align-items: center;

    border-radius: 6px;
    background: var(--r-neutral-card-2, #f2f4f7);
    padding: 12px 15px;
    border: 1px solid transparent;
    cursor: pointer;

    & + .option-item {
      margin-top: 12px;
    }

    /* &.is-selected {
      border: 1px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light-1, #eef1ff);
    } */

    &:not(.is-disabled):hover {
      border: 1px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light-1, #eef1ff);
    }

    &.is-disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &-title {
      color: var(--r-neutral-title-1, #192945);
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      margin-bottom: 4px;
    }

    &-desc {
      color: var(--r-neutral-body, #3e495e);
      font-size: 13px;
      font-weight: 400;
      line-height: 16px;
    }
  }
`;

interface Props {
  visible?: boolean;
  onClose?: () => void;
  onCancelTx?: (mode: CANCEL_TX_TYPE) => void;
  tx: TransactionHistoryItem;
}
export const CancelTxPopup = ({ visible, onClose, onCancelTx, tx }: Props) => {
  const { t } = useTranslation();
  const options = [
    {
      title: t(
        'page.activities.signedTx.CancelTxPopup.options.quickCancel.title'
      ),
      desc: t(
        'page.activities.signedTx.CancelTxPopup.options.quickCancel.desc'
      ),
      value: CANCEL_TX_TYPE.QUICK_CANCEL,
      tips: t(
        'page.activities.signedTx.CancelTxPopup.options.quickCancel.tips'
      ),
      disabled: tx.pushType !== 'low_gas' || tx.hash,
    },
    {
      title: t(
        'page.activities.signedTx.CancelTxPopup.options.onChainCancel.title'
      ),
      desc: t(
        'page.activities.signedTx.CancelTxPopup.options.onChainCancel.desc'
      ),
      value: CANCEL_TX_TYPE.ON_CHAIN_CANCEL,
    },
  ];
  return (
    <Popup
      title={t('page.activities.signedTx.CancelTxPopup.title')}
      visible={visible}
      onClose={onClose}
      closable
      height={228}
      isSupportDarkMode
    >
      <OptionsList>
        {options.map((item) => {
          return (
            <TooltipWithMagnetArrow
              title={item.disabled ? item.tips || '' : ''}
              key={item.value}
              className="rectangle w-[max-content]"
            >
              <div
                className={clsx('option-item', item.disabled && 'is-disabled')}
                onClick={() => {
                  if (item?.disabled) {
                    return;
                  }
                  onCancelTx?.(item.value);
                }}
              >
                <div>
                  <div className="option-item-title">{item.title}</div>
                  <div className="option-item-desc">{item.desc}</div>
                </div>
                <img src="" alt="" />
              </div>
            </TooltipWithMagnetArrow>
          );
        })}
      </OptionsList>
    </Popup>
  );
};
