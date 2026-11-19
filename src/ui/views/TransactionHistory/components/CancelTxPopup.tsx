import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CANCEL_TX_TYPE } from '@/constant';
import { PageHeader, Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CancelTxConfirmPopup } from './CancelTxConfirmPopup';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import styles from './CancelTxPopup.module.css';

interface Props {
  visible?: boolean;
  onClose?: () => void;
  onCancelTx?: (mode: CANCEL_TX_TYPE) => void;
  tx: TransactionHistoryItem;
}
export const CancelTxPopup = ({ visible, onClose, onCancelTx, tx }: Props) => {
  const { t } = useTranslation();
  const [
    isShowRemoveLocalPendingTxTips,
    setIsShowRemoveLocalPendingTxTips,
  ] = useState(false);

  const { getContainer } = usePopupContainer();

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
    // {
    //   title: t(
    //     'page.activities.signedTx.CancelTxPopup.options.removeLocalPendingTx.title'
    //   ),
    //   desc: t(
    //     'page.activities.signedTx.CancelTxPopup.options.removeLocalPendingTx.desc'
    //   ),
    //   value: CANCEL_TX_TYPE.REMOVE_LOCAL_PENDING_TX,
    // },
  ];
  return (
    <>
      <Popup
        title={t('page.activities.signedTx.CancelTxPopup.title')}
        visible={visible}
        onClose={onClose}
        closable
        height={232}
        isSupportDarkMode
        getContainer={getContainer}
      >
        <div className={styles.optionsList}>
          {options.map((item) => {
            return (
              <TooltipWithMagnetArrow
                title={item.disabled ? item.tips || '' : ''}
                key={item.value}
                className="rectangle w-[max-content]"
              >
                <div
                  className={clsx(
                    'option-item',
                    item.disabled && 'is-disabled'
                  )}
                  onClick={() => {
                    if (item?.disabled) {
                      return;
                    }
                    if (item.value === CANCEL_TX_TYPE.REMOVE_LOCAL_PENDING_TX) {
                      setIsShowRemoveLocalPendingTxTips(true);
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
        </div>
      </Popup>
      <CancelTxConfirmPopup
        visible={isShowRemoveLocalPendingTxTips}
        onClose={() => {
          setIsShowRemoveLocalPendingTxTips(false);
        }}
        onConfirm={() => {
          onCancelTx?.(CANCEL_TX_TYPE.REMOVE_LOCAL_PENDING_TX);
          setIsShowRemoveLocalPendingTxTips(false);
        }}
      />
    </>
  );
};
