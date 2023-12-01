import { BlueHeader, Item } from '@/ui/component';
import { openInTab, openInternalPageInTab } from '@/ui/utils';
import { Timeline } from 'antd';
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
        className="p-6 bg-r-blue-light-1 text-r-blue-default text-12 font-medium relative top-8 rounded-[2px]"
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

  const importList = React.useMemo(
    () => [
      {
        icon: RcIconMnemonics,
        content: t('page.newAddress.importSeedPhrase'),
        onClick: () => {
          openInternalPageInTab('import/mnemonics');
        },
      },
      {
        icon: RcIconPrivatekey,
        content: t('page.newAddress.importPrivateKey'),
        onClick: () => {
          history.push('/import/key');
        },
      },
    ],
    [t]
  );
  return (
    <div className="add-metamask">
      <BlueHeader className="mx-[-20px]">
        {t('page.newAddress.importMyMetamaskAccount')}
      </BlueHeader>
      <div className="rabby-container text-r-neutral-title-1">
        <div className="relative bg-r-neutral-card-1 mt-[12px] rounded-[6px] px-[12px] py-[12px] mb-[12px]">
          <div className="metamask-shadow" />

          <div className="flex items-center">
            <img
              src={IconMetamask}
              className="w-[32px] h-[32px]"
              alt="MetaMask"
            />
            <div className="pl-[12px] text-[16px] font-medium text-r-neutral-title-1">
              {t('page.newAddress.metamask.how')}
            </div>
          </div>
          <div className="relative rounded border border-rabby-blue-default mt-14 mb-16">
            <div className="absolute left-[9px] top-[-8px] bg-r-neutral-bg-2 text-r-blue-default text-12 font-medium pl-2 pr-4">
              {t('page.newAddress.metamask.tips')}
            </div>
            <div className="p-8 text-r-blue-default text-12 font-normal leading-[16px]">
              {t('page.newAddress.metamask.tipsDesc')}
            </div>
          </div>

          <div className="relative left-[-5px] mr-[-12px]">
            <Timeline>
              {stepList.map((step, i) => (
                <Timeline.Item
                  color="transparent"
                  dot={
                    <span className="text-13 font-medium text-r-neutral-title-1">
                      {t('page.newAddress.metamask.step')}
                      {i + 1}:
                    </span>
                  }
                >
                  <div
                    className={clsx(
                      'text-13 font-medium text-r-neutral-title-1 leading-[18px]',
                      i === 0 && 'ml-[-2px]'
                    )}
                  >
                    {step}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </div>

        <div className="bg-r-neutral-card-1 rounded-[6px] ">
          <div className="border-b border-rabby-neutral-line py-[15px] px-[19px]">
            <div className="text-15 font-medium text-r-neutral-title-1">
              {t('page.newAddress.metamask.importSeedPhrase')}
            </div>

            <div className="mt-[3px] text-12 text-r-neutral-body">
              {t('page.newAddress.metamask.importSeedPhraseTips')}
            </div>
          </div>

          {importList.map((e, idx) => (
            <Item
              bgColor="transparent"
              key={`${e.content}-${idx}`}
              leftIcon={e.icon}
              leftIconClassName="icon text-r-neutral-body"
              onClick={e.onClick}
              py={15}
            >
              <div className="pl-[12px] text-13 font-medium text-r-neutral-title-1">
                {e.content}
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
};
