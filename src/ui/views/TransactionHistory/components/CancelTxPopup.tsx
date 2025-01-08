import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CANCEL_TX_TYPE } from '@/constant';
import { PageHeader, Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
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
  const [isShowClearPendingTips, setIsShowClearPendingTips] = useState(false);
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
    {
      title: t(
        'page.activities.signedTx.CancelTxPopup.options.removeLocalTx.title'
      ),
      desc: t(
        'page.activities.signedTx.CancelTxPopup.options.removeLocalTx.desc'
      ),
      value: CANCEL_TX_TYPE.CLEAR_PENDING_TX,
    },
  ];
  return (
    <Popup
      title={t('page.activities.signedTx.CancelTxPopup.title')}
      visible={visible}
      onClose={onClose}
      closable
      height={308}
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
                  if (item.value === CANCEL_TX_TYPE.CLEAR_PENDING_TX) {
                    setIsShowClearPendingTips(true);
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
      <div
        className={clsx(
          'absolute z-[99] w-full h-full left-0 top-0',
          'bg-r-neutral-bg-1 rounded-t-[16px] transition-transform duration-300',
          isShowClearPendingTips ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="px-[20px]">
          <PageHeader
            forceShowBack
            className="bg-transparent"
            onBack={() => {
              setIsShowClearPendingTips(false);
            }}
          >
            {t('page.activities.signedTx.CancelTxPopup.clearPending.title')}
          </PageHeader>
        </div>
        <div className="px-[20px] pt-[2px]">
          <p className="m-0 text-[14px] leading-[140%] text-r-neutral-body">
            {t('page.activities.signedTx.CancelTxPopup.clearPending.desc')}
          </p>
        </div>
        <div
          className={clsx(
            'absolute bottom-0 left-0 right-0',
            'mt-auto py-[18px] px-[20px]',
            'border-solid border-t-[0.5px] border-rabby-neutral-line'
          )}
        >
          <Button
            type="primary"
            size="large"
            block
            // onClick={handleResetAccount}
            onClick={() => {
              onCancelTx?.(CANCEL_TX_TYPE.CLEAR_PENDING_TX);
              setIsShowClearPendingTips(false);
            }}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </div>
    </Popup>
  );
};
