import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { connectStore, useRabbyDispatch } from 'ui/store';
import { Button } from 'antd';
import { Card } from '@/ui/component/NewUserImport';
import { ReactComponent as RcIconTips } from '@/ui/assets/new-user-import/tips.svg';
import { ReactComponent as IconDotCC } from '@/ui/assets/new-user-import/dot-cc.svg';

function useQuestionsCheck() {
  const { t } = useTranslation();

  const QUESTIONS = React.useMemo(() => {
    return [
      {
        index: 1 as const,
        content: t('page.newAddress.seedPhrase.importQuestion1'),
      },
      {
        index: 2 as const,
        content: t('page.newAddress.seedPhrase.importQuestion2'),
      },
      {
        index: 3 as const,
        content: t('page.newAddress.seedPhrase.importQuestion3'),
      },
    ];
  }, []);

  return {
    questionChecks: QUESTIONS,
  };
}

const RiskCheck = () => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const { questionChecks } = useQuestionsCheck();

  return (
    <Card title={t('page.newUserImport.createNewAddress.title')}>
      <RcIconTips className="w-[54px] h-[49px] mx-auto mt-[24px]" />
      <div className="mt-[22px] mb-[26px] text-[16px] font-medium text-center text-rabby-blue-default">
        {t('page.newUserImport.createNewAddress.desc')}
      </div>
      <div className="flex flex-col gap-16">
        {questionChecks.map((item, index) => (
          <div
            key={item.index}
            className={clsx('flex justify-start gap-8', 'px-12')}
          >
            <IconDotCC
              className="mt-6 text-rabby-blue-default flex-shrink-0"
              viewBox="0 0 8 8"
            />
            <span className="text-15 text-r-neutral-title1 font-normal">
              {item.content}
            </span>
          </div>
        ))}
      </div>

      <Button
        onClick={() => dispatch.createMnemonics.stepTo('display')}
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

export default connectStore()(RiskCheck);
