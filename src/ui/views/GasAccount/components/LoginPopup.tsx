import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressViewer, Popup } from '@/ui/component';
import { PopupProps } from '@/ui/component/Popup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import clsx from 'clsx';
import { CopyChecked } from '@/ui/component/CopyChecked';
import {
  useGasAccountInfo,
  useGasAccountMethods,
  useGasAccountSign,
} from '../hooks';
import { useAlias } from '@/ui/utils';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { SelectGasAccountList } from './SelectGasAccountList';
import { Account } from '@/background/service/preference';

export const GasACcountCurrentAddress = ({
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

  const [alias] = useAlias(account?.address || currentAccount?.address || '');

  const addressTypeIcon = useBrandIcon({
    address: account?.address || currentAccount!.address,
    brandName: account?.brandName || currentAccount!.brandName,
    type: account?.type || currentAccount!.type,
  });

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
              address={account?.address || currentAccount!.address}
              showArrow={false}
              className="text-[12px] text-r-neutral-body relative top-1"
            />
            <CopyChecked
              addr={account?.address || currentAccount!.address}
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

const GasAccountLoginContent = ({ onLogin }: { onLogin?(): void }) => {
  const { t } = useTranslation();

  const { login, logout } = useGasAccountMethods();

  const { value: gasAccountInfo } = useGasAccountInfo();
  const { sig } = useGasAccountSign();

  const [loading, setLoading] = useState(false);

  const confirmAddress = async (account: Account) => {
    if (loading) {
      return;
    }
    const isSwitch = gasAccountInfo?.account.id || sig;
    setLoading(true);
    try {
      if (isSwitch) {
        await logout();
      }
      await login(account);
      await onLogin?.();
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[24px]">
        {t('page.gasAccount.loginConfirmModal.title')}
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
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      closable
      {...props}
    >
      <GasAccountLoginContent
        onLogin={() => {
          props.onCancel?.();
        }}
      />
    </Popup>
  );
};
