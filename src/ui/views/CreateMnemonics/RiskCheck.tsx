import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import clsx from 'clsx';
import { Field, Checkbox } from 'ui/component';
import { connectStore, useRabbyDispatch } from 'ui/store';
import { Button } from 'antd';
import LogoSVG from '@/ui/assets/logo.svg';

const QuestionsWrapper = styled.div`
  .field-slot {
    font-weight: 500;
    font-size: 13px;
    line-height: 16px;
    color: var(--r-neutral-title-1);
  }
`;

const RiskTipText = styled.p`
  font-weight: 500;
  font-size: 17px;
  line-height: 24px;
  text-align: center;
  color: var(--r-neutral-title-1);
`;

function useQuestionsCheck() {
  const { t } = useTranslation();

  const QUESTIONS = React.useMemo(() => {
    return [
      {
        index: 1 as const,
        content: t('page.newAddress.seedPhrase.importQuestion1'),
        checked: true,
      },
      {
        index: 2 as const,
        content: t('page.newAddress.seedPhrase.importQuestion2'),
        checked: true,
      },
      {
        index: 3 as const,
        content: t('page.newAddress.seedPhrase.importQuestion3'),
        checked: true,
      },
      {
        index: 4 as const,
        content: t('page.newAddress.seedPhrase.importQuestion4'),
        checked: true,
      },
    ];
  }, []);

  const [questionChecks, setQuestionChecks] = React.useState(QUESTIONS);

  type TIndex = typeof QUESTIONS[number]['index'];
  const toggleCheckedByIndex = React.useCallback((index: TIndex) => {
    setQuestionChecks((prev) => {
      const idx = prev.findIndex((item) => item.index === index);

      prev[idx].checked = !prev[idx].checked;

      return [...prev];
    });
  }, []);

  return {
    questionChecks,
    isAllChecked: React.useMemo(
      () => questionChecks.every((item) => item.checked),
      [questionChecks]
    ),
    toggleCheckedByIndex,
  };
}

const RiskCheck = () => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const {
    questionChecks,
    isAllChecked,
    toggleCheckedByIndex,
  } = useQuestionsCheck();

  return (
    <div className={clsx('mx-auto pt-[58px]', 'w-[600px]')}>
      <img src={LogoSVG} alt="Rabby" className="mb-[12px]" />
      <div
        className={clsx(
          'px-[120px] pt-[32px] pb-[40px]',
          'bg-r-neutral-card-1 rounded-[12px]'
        )}
      >
        <h1
          className={clsx(
            'flex items-center justify-center',
            'space-x-[16px] mb-[24px]',
            'text-[20px] text-r-neutral-title-1'
          )}
        >
          <span>{t('page.newAddress.createNewSeedPhrase')}</span>
        </h1>
        <div>
          <RiskTipText className="mb-32">
            {t('page.newAddress.seedPhrase.riskTips')}
          </RiskTipText>
          <QuestionsWrapper>
            {questionChecks.map((q) => {
              const handleClickItem = () => {
                toggleCheckedByIndex(q.index);
              };
              return (
                <Field
                  key={`item-${q.index}`}
                  className={clsx(
                    'bg-r-neutral-card-2 flex justify-between items-center p-16 border transition-colors',
                    'border-transparent hover:border-rabby-blue-default hover:bg-r-blue-light-1',
                    'text-13'
                  )}
                  leftIcon={
                    <Checkbox
                      checked={q.checked}
                      width={'20px'}
                      height={'20px'}
                      background="var(--r-green-default, #2ABB7F)"
                      onChange={handleClickItem}
                    />
                  }
                  rightIcon={null}
                  onClick={handleClickItem}
                >
                  {q.content}
                </Field>
              );
            })}
          </QuestionsWrapper>
        </div>
        <div className="text-center mt-[76px]">
          <Button
            type="primary"
            size="large"
            disabled={!isAllChecked}
            onClick={() => dispatch.createMnemonics.stepTo('display')}
            className="py-[13px] px-[56px] h-auto"
          >
            {t('page.newAddress.seedPhrase.showSeedPhrase')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default connectStore()(RiskCheck);
