import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as RcIconChecked } from '@/ui/assets/new-user-import/check.svg';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { useAsync } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';

export const CreateSeedPhrase = () => {
  const { t } = useTranslation();

  const history = useHistory();

  const { setStore } = useNewUserGuideStore();

  const tipList = React.useMemo(
    () => [
      t('page.newUserImport.createNewAddress.tip1'),
      t('page.newUserImport.createNewAddress.tip2'),
      t('page.newUserImport.createNewAddress.tip3'),
    ],
    []
  );

  const wallet = useWallet();

  const { value } = useAsync(async () => wallet.generateMnemonic(), []);

  const showSeedPhrase = () => {
    if (value) {
      setStore({
        seedPhrase: value,
        passphrase: '',
      });
      history.push('/new-user/backup-seed-phrase');
    }
  };

  return (
    <Card
      onBack={() => {
        history.replace('/new-user/guide');
      }}
      title={t('page.newUserImport.createNewAddress.title')}
    >
      <div className="mt-[36px] mb-20 text-[16px] font-medium text-r-neutral-title1 text-center">
        {t('page.newUserImport.createNewAddress.desc')}
      </div>
      <div className="flex flex-col gap-12">
        {tipList.map((item, index) => (
          <div
            key={item}
            className={clsx(
              'flex justify-start gap-8',
              'px-12 py-16 h-[68px] rounded-[8px]',
              'border-[0.5px] border-solid border-rabby-neutral-line',
              'text-13 font-medium text-r-neutral-title1'
            )}
          >
            <RcIconChecked
              className="relative top-[2px] min-w-[16px] w-[16px] h-[16px]"
              viewBox="0 0 16 16"
            />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={showSeedPhrase}
        block
        type="primary"
        className={clsx(
          'mt-[76px] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {t('page.newUserImport.createNewAddress.showSeedPhrase')}
      </Button>
    </Card>
  );
};
