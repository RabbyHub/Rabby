import { BlueHeader } from '@/ui/component';
import { openInTab, openInternalPageInTab } from '@/ui/utils';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import { ReactComponent as RcIconMnemonics } from 'ui/assets/import/mnemonics-currentcolor.svg';
import { ReactComponent as RcIconPrivatekey } from 'ui/assets/import/privatekey-currentcolor.svg';
import IconTinRightArrow from 'ui/assets/address/tiny-arrow-right.svg';

import './style.less';
import clsx from 'clsx';

export const ImportMyMetaMaskAccount = () => {
  const history = useHistory();
  const { t } = useTranslation();

  const stepList = [
    <Trans t={t} i18nKey="page.newAddress.metamask.step1">
      Export seed phrase or private key from MetaMask
      <a
        href="javascript:void(0)"
        target="_blank"
        onClick={(e) => {
          e.preventDefault();
          openInTab('https://rabby.io/metamask-export');
        }}
        className="hidden p-6 bg-r-blue-light-1 text-r-blue-default text-12 font-medium relative top-8 rounded-[2px]"
      >
        Click to view tutorial
        <img
          src={IconTinRightArrow}
          className="inline-block relative w-14 h-14"
        />
      </a>
    </Trans>,
    <Trans i18nKey="page.newAddress.metamask.step2" />,
    <Trans i18nKey="page.newAddress.metamask.step3" />,
  ];

  return (
    <div className="add-metamask">
      <BlueHeader className="mx-[-20px]">
        {t('page.newAddress.importMyMetamaskAccount')}
      </BlueHeader>
      <div className="rabby-container text-r-neutral-title-1">
        <div
          style={{
            background:
              'linear-gradient(180deg, rgba(251, 140, 0, 0.12) 0%, rgba(251, 140, 0, 0.00) 30.37%), var(--r-neutral-card1, #FFF)',
          }}
          className="relative rounded-[6px] px-[12px] py-[16px] my-20"
        >
          <div className="flex items-center justify-center">
            <img
              src={IconMetamask}
              className="w-[20px] h-[20px]"
              alt="MetaMask"
            />
            <div className="pl-[12px] text-[15px] font-medium text-r-neutral-title-1">
              {t('page.newAddress.metamask.how')}
            </div>
          </div>
          <div className="rounded bg-rabby-blue-light1 mt-12">
            <div className="p-8 text-r-blue-default text-12 font-normal leading-[16px]">
              {t('page.newAddress.metamask.tips')}
              {t('page.newAddress.metamask.tipsDesc')}
            </div>
          </div>
        </div>

        <div className="bg-r-neutral-card-1 rounded-[6px] ">
          <div className="flex flex-col items-center border-rabby-neutral-line py-[20px] px-[16px] pb-[24px]">
            <div className="flex items-center mb-16">
              <span className="text-[13px] font-medium text-r-blue-default mr-2">
                {t('page.newAddress.metamask.step')}1:
              </span>
              <div className="text-[12px] leading-[18px] font-medium text-r-neutral-title1 whitespace-nowrap">
                {stepList[0]}
              </div>
            </div>

            <div
              className={clsx(
                'border border-transparent hover:border-rabby-blue-default hover:bg-rabby-blue-light1',
                'w-[210px] h-[44px] cursor-pointer mt-4',
                'flex justify-center items-center gap-[6px]',
                'text-[13px] font-medium text-r-neutral-body',
                'rounded-[6px] bg-r-neutral-card-2'
              )}
              onClick={() => {
                openInTab('https://rabby.io/metamask-export');
              }}
            >
              View export tutorial
            </div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={'100%'}
            viewBox="0 0 360 2"
            height={2}
            fill="none"
          >
            <path
              stroke="var(--r-neutral-line, #D3D8E0)"
              strokeWidth={0.2}
              d="M0 1h360"
            />
          </svg>

          <div className="flex flex-col items-center border-rabby-neutral-line py-[20px] px-[16px] pb-[32px]">
            <div className="flex items-center mb-16">
              <span className="text-[13px] font-medium text-r-blue-default mr-2">
                {t('page.newAddress.metamask.step')}2:{' '}
              </span>
              <div className="text-[12px] leading-[18px] font-medium text-r-neutral-title1 whitespace-nowrap">
                {stepList[1]}
              </div>
            </div>

            <div
              className={clsx(
                'border border-transparent hover:border-rabby-blue-default hover:bg-rabby-blue-light1',
                'w-[210px] h-[44px] cursor-pointer mt-4',
                'flex justify-center items-center gap-[6px]',
                'text-[13px] font-medium text-r-neutral-body',
                'rounded-[6px] bg-r-neutral-card-2'
              )}
              onClick={() => {
                openInternalPageInTab('import/mnemonics');
              }}
            >
              <RcIconMnemonics />
              {t('page.newAddress.importSeedPhrase')}
            </div>

            <div
              className={clsx(
                'border border-transparent hover:border-rabby-blue-default hover:bg-rabby-blue-light1',
                'w-[210px] h-[44px]  cursor-pointer mt-16',
                'flex justify-center items-center gap-[6px]',
                'text-[13px] font-medium text-r-neutral-body',
                'rounded-[6px] bg-r-neutral-card-2'
              )}
              onClick={() => {
                history.push('/import/key');
              }}
            >
              <RcIconPrivatekey />
              {t('page.newAddress.importPrivateKey')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
