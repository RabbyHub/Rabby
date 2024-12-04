import React from 'react';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as RcIconRabbyLogo } from '@/ui/assets/new-user-import/logo.svg';
import { Button } from 'antd';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const Guide = () => {
  const { t } = useTranslation();
  const history = useHistory();

  const gotoCreate = React.useCallback(() => {
    history.push('/new-user/create-seed-phrase');
  }, []);

  const gotoImport = React.useCallback(() => {
    history.push('/new-user/import-list');
  }, []);

  return (
    <Card>
      <div className="flex flex-col items-center">
        <RcIconRabbyLogo
          viewBox="0 0 100 100"
          className="mt-[100px] w-[100px] h-[100px]"
        />
        <div className="my-12 text-24 font-medium text-r-neutral-title1">
          {t('page.newUserImport.guide.title')}
        </div>
        <div className="max-w-[320px] text-14 font-normal text-r-neutral-foot text-center">
          {t('page.newUserImport.guide.desc')}
        </div>

        <Button
          onClick={gotoCreate}
          block
          type="primary"
          className={clsx(
            'mt-[85px] mb-16',
            'h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium'
          )}
        >
          {t('page.newUserImport.guide.createNewAddress')}
        </Button>

        <Button
          onClick={gotoImport}
          block
          type="primary"
          ghost
          className={clsx(
            'h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium',
            'hover:bg-light-r-blue-light1 hover:before:hidden hover:border-rabby-blue-default hover:text-r-blue-default'
          )}
        >
          {t('page.newUserImport.guide.importAddress')}
        </Button>
      </div>
    </Card>
  );
};
