import React from 'react';
import { Popup } from '@/ui/component';
import { ReactComponent as RCIconRabbyWhite } from '@/ui/assets/swap/rabby.svg';
import { useTranslation } from 'react-i18next';
import ImgMetaMask from '@/ui/assets/swap/metamask.png';
import ImgPhantom from '@/ui/assets/swap/phantom.png';
import ImgRabbyWallet from '@/ui/assets/swap/rabby-wallet.png';
import clsx from 'clsx';
import { Button } from 'antd';

const swapFee = [
  {
    name: 'MetaMask',
    logo: ImgMetaMask,
    rate: '0.875%',
  },
  {
    name: 'Phantom',
    logo: ImgPhantom,
    rate: '0.85%',
  },
  {
    name: 'Rabby Wallet',
    logo: ImgRabbyWallet,
    rate: '0.25%',
  },
];

const bridgeList = [
  {
    name: 'MetaMask',
    logo: ImgMetaMask,
    rate: '0.875%',
  },
  {
    name: 'Rabby Wallet',
    logo: ImgRabbyWallet,
    rate: '0.25%',
  },
];

const fee = {
  swap: swapFee,
  bridge: bridgeList,
};

export const RabbyFeePopup = ({
  visible,
  onClose,
  type = 'swap',
}: {
  visible: boolean;
  onClose: () => void;
  type?: keyof typeof fee;
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      visible={visible}
      title={null}
      height={type === 'swap' ? 478 : 428}
      isSupportDarkMode
      onCancel={onClose}
      bodyStyle={{
        paddingTop: 24,
        paddingBottom: 20,
      }}
    >
      <div className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-r-blue-default mx-auto">
        <RCIconRabbyWhite viewBox="0 0 36 30" width="36" height="30" />
      </div>

      <div className="text-20 text-center font-medium text-r-neutral-title1 my-12 leading-normal">
        {t('page.swap.rabbyFee.title')}
      </div>

      <div className="text-14 text-center  text-rabby-neutral-body leading-[150%]">
        {t('page.swap.rabbyFee.desc')}
      </div>

      <div
        className={clsx(
          'flex justify-between items-center',
          'px-16 mt-20 mb-8',
          'text-12 text-r-neutral-foot'
        )}
      >
        <span>{t('page.swap.rabbyFee.wallet')}</span>
        <span>{t('page.swap.rabbyFee.rate')}</span>
      </div>
      <div className="border-[0.5px] border-rabby-neutral-line rounded-[6px]">
        {fee[type].map((item, idx, list) => (
          <div
            key={item.name}
            className={clsx(
              'flex justify-between items-center',
              'px-16 py-12',
              'border-b-[0.5px] border-solid border-rabby-neutral-line',
              idx === list.length - 1 ? 'border-b-0' : ''
            )}
          >
            <div className="flex items-center">
              <img src={item.logo} className="w-[20px] h-[20px] mr-8" />
              <span className="text-13 leading-normal font-medium text-rabby-neutral-title1">
                {item.name}
              </span>
            </div>
            <span className="text-13 leading-normal font-medium text-rabby-neutral-title1">
              {item.rate}
            </span>
          </div>
        ))}
      </div>
      <Button
        type="primary"
        block
        size="large"
        className="mt-[20px] h-[48px] text-16 font-medium text-r-neutral-title2"
        onClick={onClose}
      >
        {t('page.swap.rabbyFee.button')}
      </Button>
    </Popup>
  );
};
