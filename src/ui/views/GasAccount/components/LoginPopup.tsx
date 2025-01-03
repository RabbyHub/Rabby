import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressViewer, Popup } from '@/ui/component';
import { Button } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { noop } from 'lodash';
import clsx from 'clsx';
import { CopyChecked } from '@/ui/component/CopyChecked';
import { useGasAccountMethods } from '../hooks';
import { useAlias } from '@/ui/utils';
import { GasAccountBlueBorderedButton } from './Button';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { GasAccountWrapperBg } from './WrapperBg';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';

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

const GasAccountLoginContent = ({
  onClose,
  showConfirm,
  setToConfirm,
}: {
  onClose: () => void;
  showConfirm: boolean;
  setToConfirm: (value: boolean) => void;
}) => {
  const { t } = useTranslation();

  const { login } = useGasAccountMethods();

  const gotoLogin = () => {
    setToConfirm(true);
  };

  const confirmAddress = () => {
    login();
  };

  if (showConfirm) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center">
        <div className="text-20 font-medium text-r-neutral-title1 mt-20 mb-[24px]">
          {t('page.gasAccount.loginConfirmModal.title')}
        </div>
        <GasACcountCurrentAddress />
        <div
          className={clsx(
            'flex items-center justify-center gap-16',
            'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
          )}
        >
          <GasAccountBlueBorderedButton onClick={onClose} block>
            {t('global.Cancel')}
          </GasAccountBlueBorderedButton>

          <Button
            onClick={confirmAddress}
            block
            size="large"
            type="primary"
            className="h-[48px] text-r-neutral-title2 text-15 font-medium"
          >
            {t('global.Confirm')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <GasAccountWrapperBg className="w-full h-full flex flex-col justify-center items-center relative">
      <GasAccountBlueLogo className="w-[60px] h-[60px] my-24" />
      <div className="relative flex gap-8 mb-[16px] text-18 font-medium text-r-blue-default">
        <RcIconQuoteStart
          viewBox="0 0 11 9"
          className="absolute top-0 left-[-20px]"
        />
        {t('page.gasAccount.loginInTip.title')}
      </div>
      <div className="flex gap-8 text-18 font-medium text-r-blue-default relative">
        {t('page.gasAccount.loginInTip.desc')}
        <RcIconQuoteEnd
          viewBox="0 0 11 9"
          className="absolute top-0 right-[-20px]"
        />
      </div>
      <div className="w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line">
        <Button
          onClick={gotoLogin}
          type="primary"
          block
          className="h-[48px] text-15 font-medium leading-normal text-r-neutral-title2"
        >
          {t('page.gasAccount.loginInTip.login')}
        </Button>
      </div>
    </GasAccountWrapperBg>
  );
};

export const GasAccountLoginPopup = (props: PopupProps) => {
  const [toConfirm, setToConfirm] = useState(false);
  const currentAccount = useCurrentAccount();

  return (
    <Popup
      placement="bottom"
      height={toConfirm ? 240 : 280}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      {...props}
    >
      <GasAccountLoginContent
        onClose={props.onCancel || props.onClose || noop}
        showConfirm={toConfirm && Boolean(currentAccount)}
        setToConfirm={setToConfirm}
      />
    </Popup>
  );
};
