import { BlueHeader, Item } from '@/ui/component';
import { openInTab, openInternalPageInTab } from '@/ui/utils';
import { Timeline } from 'antd';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import IconMnemonics from 'ui/assets/import/mnemonics.svg';
import IconPrivatekey from 'ui/assets/import/privatekey.svg';
import { ReactComponent as IconTinRightArrow } from 'ui/assets/address/tiny-arrow-right.svg';

import './style.less';

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
      >
        Guidance <IconTinRightArrow className="inline-block relative" />
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
    <div className="add-metamask ">
      <BlueHeader className="mx-[-20px]">
        {t('page.newAddress.importMyMetamaskAccount')}
      </BlueHeader>
      <div className="rabby-container">
        <div className="relative bg-white mt-[12px] rounded-[6px] px-[12px] py-[20px] pb-0 mb-[20px]">
          <div className="metamask-shadow" />

          <div className="flex items-center mb-[24px]">
            <img
              src={IconMetamask}
              className="w-[44px] h-[44px]"
              alt="MetaMask"
            />
            <div className="pl-[10px] text-16 font-bold text-gray-title">
              {t('page.newAddress.metamask.how')}
            </div>
          </div>

          <div className="">
            <Timeline>
              {stepList.map((step, i) => (
                <Timeline.Item
                  color="transparent"
                  dot={
                    <span className="text-13 font-bold text-gray-title">
                      {t('page.newAddress.metamask.step')} {i + 1} :{' '}
                    </span>
                  }
                >
                  <div className="text-12 leading-[18px] font-medium text-gray-title">
                    {step}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </div>

        <div className="bg-white rounded-[6px] ">
          <div className="border-b border-gray-divider py-[15px] px-[19px]">
            <div className="text-13 leading-[20px] font-medium text-gray-title">
              {t('page.newAddress.metamask.importSeedPhrase')}
            </div>

            <div className="mt-[3px] text-12 leading-[18px] text-[#666]">
              {t('page.newAddress.metamask.importSeedPhraseTips')}
            </div>
          </div>

          {importList.map((e) => (
            <Item
              key={e.icon}
              leftIcon={e.icon}
              leftIconClassName="icon"
              onClick={e.onClick}
            >
              <div className="pl-[12px] text-13 leading-[15px] font-medium text-gray-title">
                {e.content}
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
};
