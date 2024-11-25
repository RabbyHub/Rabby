import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { Button, message } from 'antd';
import { useTranslation } from 'react-i18next';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import IconSuccess from '@/ui/assets/success.svg';
import { ReactComponent as RcIconCopy } from '@/ui/assets/component/icon-copy-cc.svg';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { useWallet } from '@/ui/utils';
import { useAsync } from 'react-use';

export const BackupSeedPhrase = () => {
  const { t } = useTranslation();

  const history = useHistory();

  const wallet = useWallet();

  const { value } = useAsync(async () => wallet.generateMnemonic(), []);

  const { store, setStore } = useNewUserGuideStore();

  const mnemonics = React.useMemo(() => store.seedPhrase || value, [
    value,
    store.seedPhrase,
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
        history.replace('/new-user/create-seed-phrase');
      }}
      step={1}
    >
      <div className="mt-[18px] mb-8 text-[24px] font-medium text-r-neutral-title1 text-center">
        {t('page.newAddress.seedPhrase.backup')}
      </div>
      <div className="text-14 text-r-neutral-foot text-center mb-16">
        {t('page.newAddress.seedPhrase.backupTips')}
      </div>

      {mnemonics && (
        <WordsMatrix
          focusable={false}
          closable={false}
          words={mnemonics.split(' ')}
          className="bg-transparent border-[0.5px] border-rabby-neutral-line"
        />
      )}

      <div
        className={clsx(
          'mx-auto mt-16 mb-[40px]',
          'w-[165px] h-[36px] cursor-pointer',
          'flex justify-center items-center gap-4',
          'text-13 font-medium text-r-neutral-body',
          'bg-rabby-neutral-card-2 rounded-[8px]',
          'hover:bg-r-blue-light-1 hover:text-rabby-blue-default'
        )}
        onClick={onCopyMnemonics}
      >
        <RcIconCopy viewBox="0 0 16 16" className="w-14 h-14" />
        <span>{t('page.newAddress.seedPhrase.copy')}</span>
      </div>

      <Button
        onClick={handleNext}
        block
        type="primary"
        className={clsx(
          'h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {t('page.newAddress.seedPhrase.saved')}
      </Button>
    </Card>
  );
};
