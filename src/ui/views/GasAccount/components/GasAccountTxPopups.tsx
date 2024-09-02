import React from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from '@/ui/component';
import { Button } from 'antd';
import { PopupProps } from '@/ui/component/Popup';
import { noop } from 'lodash';
import clsx from 'clsx';
import PNGDepositTip from '@/ui/assets/gas-account/gas-account-deposit-tip.png';
import { GasAccountBlueLogo } from './GasAccountBlueLogo';
import { ReactComponent as RcIconQuoteStart } from '@/ui/assets/gas-account/quote-start.svg';
import { ReactComponent as RcIconQuoteEnd } from '@/ui/assets/gas-account/quote-end.svg';

const GasAccountDepositTipContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <div className="text-20 font-medium text-r-neutral-title1 my-24">
        {t('page.gasAccount.GasAccountDepositTipPopup.title')}
      </div>
      <img src={PNGDepositTip} className="w-[283px] h-[152px]" />
      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <Button className="h-[48px]" type="primary" onClick={onClose} block>
          {t('page.gasAccount.GasAccountDepositTipPopup.gotIt')}
        </Button>
      </div>
    </div>
  );
};

export const GasAccountDepositTipPopup = (props: PopupProps) => {
  return (
    <Popup
      placement="bottom"
      height={328}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      {...props}
    >
      <GasAccountDepositTipContent
        onClose={props.onCancel || props.onClose || noop}
      />
    </Popup>
  );
};

const GasAccountLoginTipContent = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-full flex flex-col justify-center items-center">
      <GasAccountBlueLogo className="w-[60px] h-[60px] my-24" />
      <div className="relative mb-[20px] text-16 font-medium text-r-blue-default">
        <RcIconQuoteStart
          viewBox="0 0 11 9"
          className="absolute top-0 left-[-20px]"
        />
        {t('page.gasAccount.loginInTip.title')}
      </div>
      <div className="relative text-15 font-medium text-r-blue-default">
        {t('page.gasAccount.loginInTip.desc')}
        <RcIconQuoteEnd
          viewBox="0 0 11 9"
          className="absolute top-0 right-[-20px]"
        />
      </div>
      <img src={PNGDepositTip} className="w-[283px] h-[152px] my-[22px]" />

      <div
        className={clsx(
          'flex items-center justify-center gap-16',
          'w-full mt-auto px-20 py-16 border-t-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <Button className="h-[48px]" type="primary" onClick={onClose} block>
          {t('page.gasAccount.GasAccountDepositTipPopup.gotIt')}
        </Button>
      </div>
    </div>
  );
};

export const GasAccountLogInTipPopup = (props: PopupProps) => {
  return (
    <Popup
      placement="bottom"
      height={'min-content'}
      isSupportDarkMode
      bodyStyle={{
        padding: 0,
      }}
      destroyOnClose
      {...props}
    >
      <GasAccountLoginTipContent
        onClose={props.onCancel || props.onClose || noop}
      />
    </Popup>
  );
};
