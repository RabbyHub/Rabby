import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from '@/ui/component';
import { message } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { noop } from 'lodash';
import clsx from 'clsx';
import { useGasAccountMethods } from '../hooks';
import { GasACcountCurrentAddress } from './LoginPopup';
import {
  GasAccountBlueBorderedButton,
  GasAccountRedBorderedButton,
} from './Button';
import { useRabbySelector } from '@/ui/store';

const GasAccountLogoutContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();

  const { logout } = useGasAccountMethods();

  const gasAccount = useRabbySelector((s) => s.gasAccount.account);

  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      onClose();
    } catch (error) {
      message.error(error?.message || String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[24px]">
        {t('page.gasAccount.logoutConfirmModal.title')}
      </div>
      <GasACcountCurrentAddress account={gasAccount} />
      <div className="text-center text-14 text-r-neutral-body px-20">
        {t('page.gasAccount.logoutConfirmModal.desc')}
      </div>
      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <GasAccountBlueBorderedButton onClick={onClose} block>
          {t('global.Cancel')}
        </GasAccountBlueBorderedButton>

        <GasAccountRedBorderedButton
          onClick={handleLogout}
          block
          loading={loading}
        >
          {t('page.gasAccount.logoutConfirmModal.logout')}
        </GasAccountRedBorderedButton>
      </div>
    </div>
  );
};

export const GasAccountLogoutPopup = (props: PopupProps) => {
  return (
    <Popup
      placement="bottom"
      height={280}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      {...props}
    >
      <GasAccountLogoutContent
        onClose={props.onCancel || props.onClose || noop}
      />
    </Popup>
  );
};
