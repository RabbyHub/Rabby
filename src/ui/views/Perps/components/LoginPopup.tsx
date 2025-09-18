import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressViewer, Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import clsx from 'clsx';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useAlias } from '@/ui/utils';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { SelectAddressList } from './SelectAddressList';
import { Account } from '@/background/service/preference';

export const GasACcountCurrentAddress = ({
  account,
}: {
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
}) => {
  const currentAccount = useCurrentAccount();

  const [alias] = useAlias(account?.address || currentAccount?.address || '');

  const addressTypeIcon = useBrandIcon({
    address: account?.address || currentAccount!.address,
    brandName: account?.brandName || currentAccount!.brandName,
    type: account?.type || currentAccount!.type,
  });

  return (
    <div className="max-w-[calc(100%-40px)] mb-[20px] py-12 px-16 rounded-[6px] flex items-center bg-r-neutral-card-2 overflow-hidden">
      <img src={addressTypeIcon} className="w-24 h-24" />
      <span className="ml-[8px] mr-4 text-15 font-medium text-r-neutral-title-1 truncate">
        {alias}
      </span>
      <AddressViewer
        address={account?.address || currentAccount!.address}
        showArrow={false}
        className="text-13 text-r-neutral-body relative top-1"
      />
      <CopyChecked
        addr={account?.address || currentAccount!.address}
        className={clsx(
          'w-[14px] h-[14px] ml-4 text-14  cursor-pointer relative top-1'
        )}
        checkedClassName={clsx('text-[#00C087]')}
      />
    </div>
  );
};

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
