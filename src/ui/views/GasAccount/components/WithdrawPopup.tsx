import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from '@/ui/component';
import { Button, message } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { noop } from 'lodash';
import clsx from 'clsx';
import { useGasAccountSign } from '../hooks';
import { GasACcountCurrentAddress } from './LoginPopup';

import { ReactComponent as RcIconOpenExternalCC } from '@/ui/assets/open-external-cc.svg';

import { ReactComponent as RcIconConfirm } from '@/ui/assets/gas-account/confirm.svg';
import { formatUsdValue, openInTab, useWallet } from '@/ui/utils';
import { useRabbySelector } from '@/ui/store';
import { GasAccountCloseIcon } from './PopupCloseIcon';

const WithdrawContent = ({
  balance,
  onClose,
  onAfterConfirm,
}: {
  balance: number;
  onClose: () => void;
  onAfterConfirm?: () => void;
}) => {
  const { t } = useTranslation();

  const { sig, accountId } = useGasAccountSign();
  const wallet = useWallet();

  const [loading, setLoading] = useState(false);

  const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  const withdraw = async () => {
    try {
      setLoading(true);
      await wallet.openapi.withdrawGasAccount({
        sig: sig!,
        account_id: accountId!,
        amount: balance,
      });
      onClose();
      onAfterConfirm?.();
    } catch (error) {
      message.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[12px]">
        {t('page.gasAccount.withdrawPopup.title')}
      </div>
      <div className="text-center text-14 text-r-neutral-body px-10">
        {t('page.gasAccount.withdrawPopup.desc')}
      </div>

      <div className="w-full px-20">
        <div className="text-13 text-r-neutral-body mt-12 mb-8">
          {t('page.gasAccount.withdrawPopup.amount')}
        </div>
        <div className="h-[48px] pl-16 flex items-center text-15 font-medium text-r-neutral-title1 rounded-md bg-r-neutral-card2">
          {formatUsdValue(balance)}
        </div>
        <div className="text-13 text-r-neutral-body mt-12 mb-8">
          {t('page.gasAccount.withdrawPopup.to')}
        </div>

        <GasACcountCurrentAddress account={gasAccount} />
      </div>

      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <Button
          type="primary"
          className="h-[48px] text-15 font-medium text-r-neutral-title-2"
          onClick={withdraw}
          block
          loading={loading}
        >
          {t('global.confirm')}
        </Button>
      </div>
    </div>
  );
};

export const WithdrawPopup = (props: PopupProps & { balance: number }) => {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Popup
        placement="bottom"
        height={'min-content'}
        isSupportDarkMode
        bodyStyle={{
          padding: 0,
        }}
        closable
        destroyOnClose
        closeIcon={<GasAccountCloseIcon />}
        {...props}
      >
        <WithdrawContent
          onClose={props.onCancel || props.onClose || noop}
          balance={props.balance}
          onAfterConfirm={() => setVisible(true)}
        />
      </Popup>
      <WithdrawConfirmPopup
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
};

const WithdrawConfirmContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();

  const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  const gotoDeBankL2 = async () => {
    openInTab('https://debank.com/account');
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <RcIconConfirm className="w-36 h-36 mt-[34px]" viewBox="0 0 36 36" />
      <div className="text-[18px] font-medium text-r-green-default mt-12 mb-[16px]">
        {t('page.gasAccount.withdrawConfirmModal.title')}
      </div>

      <div className="mb-8">
        <GasACcountCurrentAddress account={gasAccount} />
      </div>

      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <div
          className="w-full flex items-center justify-center gap-4 cursor-pointer h-[48px] text-15 font-medium text-r-neutral-title-2 bg-r-orange-DBK rounded-md"
          onClick={gotoDeBankL2}
        >
          <span>{t('page.gasAccount.withdrawConfirmModal.button')}</span>
          <RcIconOpenExternalCC
            viewBox="0 0 12 12"
            className="w-14 h-14 text-r-neutral-title2"
          />
        </div>
      </div>
    </div>
  );
};

export const WithdrawConfirmPopup = (props: PopupProps) => {
  return (
    <>
      <Popup
        placement="bottom"
        height={'min-content'}
        isSupportDarkMode
        bodyStyle={{
          padding: 0,
        }}
        closable
        destroyOnClose
        {...props}
      >
        <WithdrawConfirmContent
          onClose={props.onCancel || props.onClose || noop}
        />
      </Popup>
    </>
  );
};
