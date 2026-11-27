import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { SelectAddressList } from '../components/SelectAddressList';
import { Account } from '@/background/service/preference';

const PerpsLoginContent = ({
  onLogin,
  visible,
  perpsAccount,
}: {
  visible: boolean;
  onLogin: (account: Account) => Promise<void>;
  perpsAccount?: Account | null;
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex flex-col justify-center items-center bg-r-neutral-bg2 rounded-t-[16px]">
      <div className="text-20 font-medium text-r-neutral-title1 mt-16 mb-16">
        {t('page.gasAccount.loginConfirmModal.title')}
      </div>

      <SelectAddressList
        onChange={onLogin}
        visible={visible}
        currentAccount={perpsAccount}
      />
    </div>
  );
};

export const PerpsLoginPopup = (
  props: PopupProps & {
    onLogin?: (account: Account) => Promise<void>;
    perpsAccount?: Account | null;
  }
) => {
  const { onLogin, perpsAccount, ...rest } = props;
  return (
    <Popup
      placement="bottom"
      height={520}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      push={false}
      closable
      {...rest}
    >
      <PerpsLoginContent
        visible={rest.visible || false}
        onLogin={async (account) => {
          await props.onLogin?.(account);
        }}
        perpsAccount={perpsAccount}
      />
    </Popup>
  );
};
