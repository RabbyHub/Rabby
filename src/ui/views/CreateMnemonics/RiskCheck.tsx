import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import clsx from 'clsx';
import { Field, Checkbox } from 'ui/component';
import { connectStore, useRabbyDispatch } from 'ui/store';
import LessPalette from 'ui/style/var-defs';
import { Button } from 'antd';
import LogoSVG from '@/ui/assets/logo.svg';

const QuestionsWrapper = styled.div`
  .field-slot {
    font-weight: 500;
    font-size: 13px;
    line-height: 16px;
    color: #13141a;
  }
`;

const RiskTipText = styled.p`
  font-weight: 500;
  font-size: 17px;
  line-height: 24px;
  text-align: center;
  color: ${LessPalette['@color-title']};
`;

function useQuestionsCheck() {
  const { t } = useTranslation();

  const QUESTIONS = React.useMemo(() => {
    return [
      {
        index: 1 as const,
        content: t('If I lose my seed phrase, my assets will be lost forever.'),
        checked: true,
      },
      {
        index: 2 as const,
        content: t(
          'If I share my seed phrase with others, my assets will be stolen.'
        ),
        checked: true,
      },
      {
        index: 3 as const,
        content: t(
          'The seed phrase is only stored on my computer, and Rabby has no access to it.'
        ),
        checked: true,
      },
      {
        index: 4 as const,
        content: t(
          'If I uninstall Rabby without backing up the seed phrase, Rabby cannot retrieve it for me.'
        ),
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
          'bg-white rounded-[12px]'
        )}
      >
        <h1
          className={clsx(
            'flex items-center justify-center',
            'space-x-[16px] mb-[24px]',
            'text-[20px] text-gray-title'
          )}
        >
          <span>Create New Seed Phrase</span>
        </h1>
        <div>
          <RiskTipText className="mb-32">
            Before you start, please read and keep the following security tips
            in mind.
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
                    'bg-gray-bg flex justify-between items-center p-16 border transition-colors',
                    'border-transparent hover:border-blue-light',
                    'text-13'
                  )}
                  leftIcon={
                    <Checkbox
                      checked={q.checked}
                      width={'20px'}
                      height={'20px'}
                      background="#27C193"
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
            Show Seed Phrase
          </Button>
        </div>
      </div>
    </div>
  );
};

export default connectStore()(RiskCheck);
