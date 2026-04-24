import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressViewer, Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import clsx from 'clsx';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useGasAccountMethods, useGasAccountSign } from '../hooks';
import { useAlias } from '@/ui/utils';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { SelectGasAccountList } from './SelectGasAccountList';
import { Account } from '@/background/service/preference';

export const GasAccountCurrentAddress = ({
  account,
  twoColumn,
}: {
  twoColumn?: boolean;
  account?: {
    address: string;
    type: string;
    brandName: string;
  };
}) => {
  const currentAccount = useCurrentAccount();
  const { account: gasAccount } = useGasAccountSign();
  const resolvedAccount = account || gasAccount || currentAccount;

  const [alias] = useAlias(resolvedAccount?.address || '');

  const addressTypeIcon = useBrandIcon({
    address: resolvedAccount?.address || '',
    brandName: resolvedAccount?.brandName || '',
    type: resolvedAccount?.type || '',
  });

  if (!resolvedAccount) {
    return null;
  }

  if (twoColumn) {
    return (
      <div className="mb-[20px] h-[56px] px-16 rounded-[6px] flex gap-10 items-center bg-r-neutral-card-2">
        <img src={addressTypeIcon} className="w-24 h-24" />
        <div className="flex flex-col overflow-hidden">
          <span className="text-13 font-medium text-r-neutral-title-1 truncate">
            {alias}
          </span>
          <div className="flex items-center">
            <AddressViewer
              address={resolvedAccount.address}
              showArrow={false}
              className="text-[12px] text-r-neutral-body relative top-1"
            />
            <CopyChecked
              addr={resolvedAccount.address}
              className={clsx(
                'w-[14px] h-[14px] ml-4 text-14  cursor-pointer relative top-1'
              )}
              checkedClassName={clsx('text-[#00C087]')}
            />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-[calc(100%-40px)] mb-[20px] py-12 px-16 rounded-[6px] flex items-center bg-r-neutral-card-2 overflow-hidden">
      <img src={addressTypeIcon} className="w-24 h-24" />
      <span className="ml-[8px] mr-4 text-15 font-medium text-r-neutral-title-1 truncate">
        {alias}
      </span>
      <AddressViewer
        address={resolvedAccount.address}
        showArrow={false}
        className="text-13 text-r-neutral-body relative top-1"
      />
      <CopyChecked
        addr={resolvedAccount.address}
        className={clsx(
          'w-[14px] h-[14px] ml-4 text-14  cursor-pointer relative top-1'
        )}
        checkedClassName={clsx('text-[#00C087]')}
      />
    </div>
  );
};

const GasAccountLoginContent = ({
  onLogin,
  getContainer,
}: {
  onLogin?(): void;
  getContainer?: PopupProps['getContainer'];
}) => {
  const { t } = useTranslation();
  const { login, logout } = useGasAccountMethods();

  const [loading, setLoading] = useState(false);

  const confirmAddress = async (account: Account) => {
    if (loading) {
      return;
    }
    setLoading(true);
    try {
      await login(account, false, { getContainer });
      await onLogin?.();
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[20px]">
        {t('page.gasAccount.switchAccount')}
      </div>

      <SelectGasAccountList isGasAccount onChange={confirmAddress} />
    </div>
  );
};

export const GasAccountLoginPopup = (props: PopupProps) => {
  return (
    <Popup
      placement="bottom"
      height={440}
      isSupportDarkMode
      isNew
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      closable
      {...props}
    >
      <GasAccountLoginContent
        getContainer={props.getContainer}
        onLogin={() => {
          props.onCancel?.();
        }}
      />
    </Popup>
  );
};
