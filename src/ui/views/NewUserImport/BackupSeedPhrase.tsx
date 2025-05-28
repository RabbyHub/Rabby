import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import IconSuccess from '@/ui/assets/success.svg';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { ReactComponent as RcIconCopy } from 'ui/assets/component/copy.svg';

export const BackupSeedPhrase = () => {
  const { t } = useTranslation();

  const history = useHistory();

  const { store, setStore } = useNewUserGuideStore();

  const mnemonics = React.useMemo(() => store.seedPhrase, [store.seedPhrase]);

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

  const handleNext = () => {
    setStore({
      seedPhrase: mnemonics,
      passphrase: '',
    });

    history.push('/new-user/import/seed-phrase/set-password?isCreated=true');
  };

  return (
    <Card
      onBack={() => {
        setStore({
          seedPhrase: '',
          passphrase: '',
        });
        if (history.length) {
          history.goBack();
        } else {
          history.replace('/new-user/create-seed-phrase');
        }
      }}
      step={1}
    >
      <div className="mt-[18px] mb-[9px] text-[28px] font-medium text-r-neutral-title1 text-center">
        {t('page.newAddress.seedPhrase.backup')}
      </div>
      <div className="text-16 text-rabby-blue-main font-semibold text-center mb-20 mx-[30px]">
        {t('page.newAddress.seedPhrase.backupTips')}
      </div>

      {mnemonics && (
        <WordsMatrix
          focusable={false}
          closable={false}
          words={mnemonics.split(' ')}
          className="bg-transparent"
        />
      )}

      <div
        className={clsx(
          'mx-auto mt-[24px] mb-[47px]',
          'cursor-pointer',
          'flex justify-center items-center gap-8',
          'text-14 font-medium text-rabby-blue-main',
          'hover:text-rabby-blue-default'
        )}
        onClick={onCopyMnemonics}
      >
        <RcIconCopy
          viewBox="0 0 20 20"
          className="w-20 h-20 text-rabby-blue-main"
        />
        <span>{t('page.newAddress.seedPhrase.copy')}</span>
      </div>

      <Button
        onClick={handleNext}
        block
        type="primary"
        className={clsx(
          'h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium bg-r-blue-main'
        )}
      >
        {t('page.newAddress.seedPhrase.saved')}
      </Button>
    </Card>
  );
};
