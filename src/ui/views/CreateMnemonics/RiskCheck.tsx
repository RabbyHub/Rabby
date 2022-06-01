import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMedia } from 'react-use';
import styled from 'styled-components';
import clsx from 'clsx';

import { StrayPageWithButton, Field, Checkbox } from 'ui/component';
import { useWallet } from 'ui/utils';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import LessPalette from 'ui/style/var-defs';

const QuestionsWrapper = styled.div``;

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
        content: t('If I lose my Seed Phrase, my assets will be lost forever!'),
        checked: false,
      },
      {
        index: 2 as const,
        content: t(
          'If I share my Seed Phrase to others, my assets will be stolen!'
        ),
        checked: false,
      },
      {
        index: 3 as const,
        content: t(
          'Seed Phrase is only stored in my computer, it is my responsibility to keep the Seed Phrase safe!'
        ),
        checked: false,
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
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [errMsg, setErrMsg] = useState('');
  const isWide = useMedia('(min-width: 401px)');

  const dispatch = useRabbyDispatch();

  const {
    questionChecks,
    isAllChecked,
    toggleCheckedByIndex,
  } = useQuestionsCheck();

  const { mnemonics } = useRabbySelector((s) => ({
    mnemonics: s.createMnemonics.mnemonics,
  }));

  const onSubmit = async (values: { mnemonics: string[] }) => {
    if (!values.mnemonics || values.mnemonics.length <= 0) {
      setErrMsg(t('Please select words'));
      return;
    }
    if (values.mnemonics.join(' ') !== mnemonics) {
      setErrMsg(t('Verification failed'));
      return;
    }
    const accounts = await wallet.createKeyringWithMnemonics(mnemonics);

    history.replace({
      pathname: history.location.pathname,
      state: {
        step: 'display',
      },
    });
  };

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      onSubmit={onSubmit}
      hasBack
      hasDivider
      onBackClick={async () => {
        await dispatch.createMnemonics.cleanCreateAsync();
        if (history.length > 1) {
          history.goBack();
        } else {
          history.replace('/');
        }
      }}
      nextDisabled={!isAllChecked}
      onNextClick={() => {
        dispatch.createMnemonics.stepTo('display');
      }}
      noPadding
    >
      <header className="create-new-header create-mnemonics-header h-[60px] leading-[60px] py-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('Create New Address')}
        </h2>
      </header>
      <div className="rabby-container">
        <div className="pt-32 px-20">
          <RiskTipText className="mb-32">
            {t(
              'Before starting, please read and keep the following security points in mind'
            )}
          </RiskTipText>
          <QuestionsWrapper>
            {questionChecks.map((q) => {
              return (
                <Field
                  key={`item-${q.index}`}
                  className={clsx(
                    'bg-white flex justify-between items-center py-12 px-16 border transition-colors',
                    'lg:w-[460px]',
                    'border-transparent'
                  )}
                  leftIcon={
                    <Checkbox
                      checked={q.checked}
                      width={'20px'}
                      height={'20px'}
                      background="#27C193"
                      // onChange={handleToggle}
                    />
                  }
                  rightIcon={null}
                  onClick={() => {
                    toggleCheckedByIndex(q.index);
                  }}
                >
                  {q.content}
                </Field>
              );
            })}
          </QuestionsWrapper>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(RiskCheck);
