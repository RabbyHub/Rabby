import { TransactionHistoryItem } from '@/background/service/transactionHistory';
import { CANCEL_TX_TYPE } from '@/constant';
import { PageHeader, Popup } from '@/ui/component';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { Button, DrawerProps } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ReactComponent as RcIconWarning } from 'ui/assets/warning-cc.svg';

interface Props {
  visible?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  maskStyle?: DrawerProps['maskStyle'];
}
export const CancelTxConfirmPopup = ({
  visible,
  onClose,
  onConfirm,
  maskStyle,
}: Props) => {
  const { t } = useTranslation();
  const { getContainer } = usePopupContainer();

  return (
    <Popup
      title={t('page.activities.signedTx.CancelTxConfirmPopup.title')}
      visible={visible}
      onClose={onClose}
      closable
      height={308}
      isSupportDarkMode
      maskStyle={maskStyle}
      getContainer={getContainer}
    >
      <div className="pt-[-4px]">
        <p className="m-0 text-[14px] leading-[140%] text-r-neutral-body">
          {t('page.activities.signedTx.CancelTxConfirmPopup.desc')}
        </p>

        <div className="flex items-start gap-[4px] p-[10px] bg-r-red-light rounded-[6px] mt-[12px]">
          <div className="text-r-red-default pt-[2px]">
            <RcIconWarning />
          </div>
          <div className="text-r-red-default text-[13px] leading-[16px] font-medium">
            {t('page.activities.signedTx.CancelTxConfirmPopup.warning')}
          </div>
        </div>
      </div>
      <div
        className={clsx(
          'absolute bottom-0 left-0 right-0',
          'mt-auto py-[18px] px-[20px] flex items-center justify-between',
          'border-solid border-t-[0.5px] border-rabby-neutral-line'
        )}
      >
        <Button
          type="ghost"
          size="large"
          onClick={onClose}
          className={clsx(
            'w-[172px]',
            'text-blue-light',
            'border-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
        >
          {t('global.Cancel')}
        </Button>
        <Button
          type="primary"
          size="large"
          className="w-[172px]"
          onClick={onConfirm}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </Popup>
  );
};
