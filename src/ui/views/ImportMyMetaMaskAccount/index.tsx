import { BlueHeader, Item } from '@/ui/component';
import { openInTab, openInternalPageInTab } from '@/ui/utils';
import { Timeline } from 'antd';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import IconMnemonics from 'ui/assets/import/mnemonics.svg';
import IconPrivatekey from 'ui/assets/import/privatekey.svg';
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
        className="p-6 bg-[#EEF1FF] text-[#7084FF] text-12 font-medium relative top-8 rounded-[2px]"
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
        icon: IconMnemonics,
        content: t('page.newAddress.importSeedPhrase'),
        onClick: () => {
          openInternalPageInTab('import/mnemonics');
        },
      },
      {
        icon: IconPrivatekey,
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
      <div className="rabby-container">
        <div className="relative bg-white mt-[12px] rounded-[6px] px-[12px] py-[20px] pb-0 mb-[20px]">
          <div className="metamask-shadow" />

          <div className="flex items-center">
            <img
              src={IconMetamask}
              className="w-[32px] h-[32px]"
              alt="MetaMask"
            />
            <div className="pl-[12px] text-[16px] font-medium text-[#192945]">
              {t('page.newAddress.metamask.how')}
            </div>
          </div>
          <div className="relative rounded border border-[#7084FF] mt-14 mb-16">
            <div className="absolute left-[9px] top-[-8px] bg-white text-[#7084FF] text-12 font-medium pl-2 pr-4">
              {t('page.newAddress.metamask.tips')}
            </div>
            <div className="p-8 text-[#7084FF] text-12 font-normal leading-[16px]">
              {t('page.newAddress.metamask.tipsDesc')}
            </div>
          </div>

          <div className="relative left-[-5px]">
            <Timeline>
              {stepList.map((step, i) => (
                <Timeline.Item
                  color="transparent"
                  dot={
                    <span className="text-13 font-medium text-[#192945]">
                      {t('page.newAddress.metamask.step')}
                      {i + 1}:
                    </span>
                  }
                >
                  <div
                    className={clsx(
                      'text-13 font-medium text-[#192945]',
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

        <div className="bg-white rounded-[6px] ">
          <div className="border-b border-gray-divider py-[15px] px-[19px]">
            <div className="text-15 font-medium text-[#192945]">
              {t('page.newAddress.metamask.importSeedPhrase')}
            </div>

            <div className="mt-[3px] text-12 text-[#3E495E]">
              {t('page.newAddress.metamask.importSeedPhraseTips')}
            </div>
          </div>

          {importList.map((e) => (
            <Item
              key={e.icon}
              leftIcon={e.icon}
              leftIconClassName="icon"
              onClick={e.onClick}
              py={15}
            >
              <div className="pl-[12px] text-13 font-medium text-[#192945]">
                {e.content}
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
};
