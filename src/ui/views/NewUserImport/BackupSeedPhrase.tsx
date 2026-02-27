import React from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import IconSuccess from '@/ui/assets/success.svg';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as RcIconCopy } from '@/ui/assets/component/icon-copy-cc.svg';
import { useMemoizedFn } from 'ahooks';
import { useWallet } from '@/ui/utils';
import { query2obj } from '@/ui/utils/url';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';
import UserGuide1 from '@/ui/assets/new-user-import/guide-1.png';
import UserGuide2 from '@/ui/assets/new-user-import/guide-2.png';
import { ReactComponent as UserGuide1Icon } from '@/ui/assets/new-user-import/guide1.svg';
import { ReactComponent as UserGuide2Icon } from '@/ui/assets/new-user-import/guide2.svg';

export const BackupSeedPhrase = () => {
  const { t } = useTranslation();

  const history = useHistory();
  const wallet = useWallet();

  const { store, setStore } = useNewUserGuideStore();

  const mnemonics = React.useMemo(() => store.seedPhrase, [store.seedPhrase]);
  const location = useLocation();

  const { address } = React.useMemo(() => query2obj(location.search), [
    location.search,
  ]);

  const onCopyMnemonics = React.useCallback(() => {
    mnemonics &&
      copyTextToClipboard(mnemonics).then(() => {
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('global.copied'),
          duration: 0.5,
        });
      });
  }, [mnemonics]);

  const handleBackup = useMemoizedFn(async () => {
    if (!address) {
      message.error('Address is missing');
      return;
    }
    await wallet.backupSeedPhraseConfirmed(address);
    // setStore({
    //   passphrase: '',
    //   seedPhrase: '',
    // });
    if (history.length > 1) {
      history.goBack();
    } else {
      window.close();
    }
  });

  return (
    <>
      <Card
        title={t('page.newAddress.seedPhrase.backup')}
        className="flex flex-col"
        onBack={() => {
          if (history.length > 1) {
            history.goBack();
          } else {
            window.close();
          }
        }}
      >
        <div className="text-[13px] leading-[16px] text-r-neutral-foot text-center mt-[14px] mb-[16px]">
          {t('page.newAddress.seedPhrase.backupTips')}
        </div>

        <div className="flex-1 flex flex-col items-center">
          {mnemonics && (
            <WordsMatrix
              focusable={false}
              closable={false}
              words={mnemonics.split(' ')}
              className="border-[0.5px] border-rabby-neutral-line"
            />
          )}

          <div
            className={clsx(
              'mx-auto mt-16',
              'h-[36px] px-[16px] cursor-pointer',
              'inline-flex justify-center items-center gap-[4px]',
              'text-13 font-medium text-r-neutral-body',
              'bg-rabby-neutral-card-2 rounded-[8px]',
              'hover:bg-r-blue-light-1 hover:text-rabby-blue-default'
            )}
            onClick={onCopyMnemonics}
          >
            <RcIconCopy viewBox="0 0 16 16" className="w-14 h-14" />
            <span>{t('page.newAddress.seedPhrase.copy')}</span>
          </div>
        </div>
        <Button
          onClick={handleBackup}
          block
          type="primary"
          className={clsx(
            'h-[52px] shadow-none rounded-[8px] mt-auto',
            'text-[15px] leading-[18px] font-medium bg-r-blue-default'
          )}
        >
          {t('page.newAddress.seedPhrase.saved')}
        </Button>
      </Card>
      <div
        className={clsx(
          'fixed top-[40px] right-[90px]',
          'w-[242px] h-[300px]',
          'py-12 px-12',
          'bg-r-neutral-card-1 rounded-[12px]'
        )}
      >
        <RcIconTriangle className="absolute top-[-39px] right-[22px]" />
        <div className="flex flex-col gap-[11px]">
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserGuide1Icon className="w-[20px] h-[20px] mr-[5px]" />
              <span className="text-[12px] font-semibold text-r-neutral-title1">
                {t('page.newUserImport.readyToUse.guides.step1')}
              </span>
            </div>
            <img
              src={UserGuide1}
              alt="user-guide-1"
              className="w-[186px] h-[96px] mt-[10px] ml-[25px]"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserGuide2Icon className="w-[20px] h-[20px] mr-[5px]" />
              <span className="text-[12px] font-semibold text-r-neutral-title1">
                {t('page.newUserImport.readyToUse.guides.step2')}
              </span>
            </div>
            <img
              src={UserGuide2}
              alt="user-guide-2"
              className="w-[183px] h-[114px] mt-[10px] ml-[25px]"
            />
          </div>
        </div>
      </div>
    </>
  );
};
