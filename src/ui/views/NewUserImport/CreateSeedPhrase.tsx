import React from 'react';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as IconDotCC } from '@/ui/assets/new-user-import/dot-cc.svg';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { useAsync } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { ReactComponent as RcIconTips } from '@/ui/assets/new-user-import/tips.svg';

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
        if (history.length) {
          history.goBack();
        } else {
          history.replace('/new-user/guide');
        }
      }}
      title={t('page.newUserImport.createNewAddress.title')}
    >
      <RcIconTips className="w-[54px] h-[49px] mx-auto mt-[24px]" />
      <div className="mt-[22px] mb-[26px] text-[16px] font-medium text-center text-rabby-blue-default">
        {t('page.newUserImport.createNewAddress.desc')}
      </div>
      <div className="flex flex-col gap-16">
        {tipList.map((item, index) => (
          <div key={item} className={clsx('flex justify-start gap-8', 'px-12')}>
            <IconDotCC
              className="mt-6 text-rabby-blue-default flex-shrink-0"
              viewBox="0 0 8 8"
            />
            <span className="text-15 text-r-neutral-title1 font-normal">
              {item}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={showSeedPhrase}
        block
        type="primary"
        className={clsx(
          'mt-[76px] h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium bg-r-blue-default'
        )}
      >
        {t('page.newUserImport.createNewAddress.showSeedPhrase')}
      </Button>
    </Card>
  );
};
