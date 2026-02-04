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
    await wallet.backUpSeedPhrase(address);
    if (history.length > 1) {
      history.goBack();
    } else {
      window.close();
    }
  });

  return (
    <Card
      title={t('page.newAddress.seedPhrase.backup')}
      className="flex flex-col"
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
  );
};
