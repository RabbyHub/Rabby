import React, { useMemo } from 'react';
import { Popup } from '@/ui/component';
import { ReactComponent as RCIconRabbyWhite } from '@/ui/assets/swap/rabby.svg';
import { useTranslation } from 'react-i18next';
import ImgMetaMask from '@/ui/assets/swap/metamask.png';
import ImgPhantom from '@/ui/assets/swap/phantom.png';
import ImgRabbyWallet from '@/ui/assets/swap/rabby-wallet.png';
import clsx from 'clsx';
import { Button, DrawerProps } from 'antd';
import { DEX } from '@/constant';

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
  feeDexDesc,
  dexName,
  getContainer,
}: {
  visible: boolean;
  onClose: () => void;
  type?: keyof typeof fee;
  dexName?: string;
  feeDexDesc?: string;
  getContainer?: DrawerProps['getContainer'];
}) => {
  const { t } = useTranslation();

  const hasSwapDexFee = useMemo(() => {
    return type === 'swap' && dexName && feeDexDesc && DEX?.[dexName]?.logo;
  }, [type, dexName, feeDexDesc]);

  const height = useMemo(() => {
    if (type === 'swap') {
      if (dexName && feeDexDesc && DEX?.[dexName]?.logo) {
        return 500;
      }
      return 493;
    }
    return 446;
  }, [type, dexName, feeDexDesc]);
  return (
    <Popup
      visible={visible}
      title={null}
      height={height}
      isSupportDarkMode
      isNew
      onCancel={onClose}
      bodyStyle={{
        paddingTop: hasSwapDexFee ? 20 : 32,
        paddingBottom: 20,
        display: 'flex',
        flexDirection: 'column',
      }}
      getContainer={getContainer}
    >
      <div className="w-[52px] h-[52px] flex items-center justify-center rounded-full bg-r-blue-default mx-auto">
        <RCIconRabbyWhite viewBox="0 0 36 30" width="36" height="30" />
      </div>

      <div className="text-20 text-center font-medium text-r-neutral-title1 my-12 leading-normal">
        {t('page.swap.rabbyFee.title')}
      </div>

      <div className="text-14 text-center  text-rabby-neutral-body leading-[150%]">
        {type === 'swap'
          ? t('page.swap.rabbyFee.swapDesc')
          : t('page.swap.rabbyFee.bridgeDesc')}
      </div>

      <div
        className={clsx(
          'flex justify-between items-center',
          'px-16  mb-6',
          'text-12 text-r-neutral-foot',
          type === 'bridge' ? 'mt-20' : hasSwapDexFee ? 'mt-20' : 'mt-[26px]'
        )}
      >
        <span>{t('page.swap.rabbyFee.wallet')}</span>
        <span>{t('page.swap.rabbyFee.rate')}</span>
      </div>
      <div className="border-[1px] border-rabby-neutral-line rounded-[6px]">
        {fee[type].map((item, idx, list) => (
          <div
            key={item.name}
            className={clsx(
              'flex justify-between items-center',
              'px-16 h-[44px]',
              'border-b-[1px] border-solid border-rabby-neutral-line',
              idx === list.length - 1 ? 'border-b-0' : ''
            )}
          >
            <div className="flex items-center">
              <img src={item.logo} className="w-[18px] h-[18px] mr-8" />
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

      <SwapAggregatorFee dexName={dexName} feeDexDesc={feeDexDesc} />

      <Button
        type="primary"
        block
        size="large"
        className="mt-[auto] h-[48px] text-16 font-medium text-r-neutral-title2"
        onClick={onClose}
      >
        {t('page.swap.rabbyFee.button')}
      </Button>
    </Popup>
  );
};

function SwapAggregatorFee({
  dexName,
  feeDexDesc,
}: {
  dexName?: string;
  feeDexDesc?: string;
}) {
  if (dexName && feeDexDesc && DEX?.[dexName]?.logo) {
    return (
      <div className="flex justify-center items-center mt-16 gap-[3px] text-12 text-r-neutral-foot">
        <img
          src={DEX[dexName].logo}
          className="w-[14px] h-[14px] rounded-full"
        />
        <span>{feeDexDesc}</span>
      </div>
    );
  }
  return null;
}
