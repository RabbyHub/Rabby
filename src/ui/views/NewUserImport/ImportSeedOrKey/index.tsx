import { Card } from '@/ui/component/NewUserImport';
import PillsSwitch from '@/ui/component/PillsSwitch';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ImportPrivateKey } from './ImportPrivateKey';
import { ImportSeedPhrase } from './ImportSeedPhrase';

export const ImportSeedOrKey = () => {
  const history = useHistory();

  const { t } = useTranslation();

  const options = React.useMemo(
    () =>
      [
        {
          key: 'seedPhrase',
          label: 'Seed Phrase',
        },
        {
          key: 'privateKey',
          label: 'Private Key',
        },
      ] as const,
    [t]
  );
  const [selectedTab, setSelectedTab] = React.useState<
    typeof options[number]['key']
  >('seedPhrase');

  return (
    <Card
      onBack={() => {
        if (history.length) {
          history.goBack();
        } else {
          history.replace('/new-user/import-list');
        }
      }}
      className="flex flex-col min-h-[520px]"
      title={t('page.newUserImport.importSeedOrKey.title')}
    >
      <div className="mt-[16px]">
        <PillsSwitch
          value={selectedTab}
          onTabChange={(v) => {
            setSelectedTab(v);
          }}
          className="flex bg-r-neutral-line w-full my-[0] h-[36px] p-[2px] rounded-[8px]"
          itemClassname={clsx(
            'w-[50%] py-[7px] text-[15px] leading-[18px] font-medium rounded-[6px]'
          )}
          itemClassnameInActive={clsx('text-r-neutral-body')}
          itemClassnameActive="bg-r-neutral-bg-1"
          options={options}
        />
      </div>
      {selectedTab === 'seedPhrase' ? (
        <ImportSeedPhrase />
      ) : (
        <ImportPrivateKey />
      )}
    </Card>
  );
};
