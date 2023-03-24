import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMedia } from 'react-use';
import styled from 'styled-components';
import clsx from 'clsx';

import { StrayPageWithButton, Field, Checkbox, Navbar } from 'ui/component';
import { useWallet } from 'ui/utils';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import LessPalette from 'ui/style/var-defs';

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
      className={clsx(isWide && 'rabby-stray-page', 'stray-page')}
      formProps={{
        validateTrigger: 'onBlur',
      }}
      onSubmit={onSubmit}
      hasDivider
      nextDisabled={!isAllChecked}
      onNextClick={() => {
        dispatch.createMnemonics.stepTo('display');
      }}
      noPadding
      NextButtonContent="Show Seed Phrase"
    >
      <Navbar
        onBack={async () => {
          await dispatch.createMnemonics.cleanCreateAsync();
          if (history.length > 1) {
            history.goBack();
          } else {
            history.replace('/');
          }
        }}
      >
        {t('Create New Address')}
      </Navbar>
      <div className="rabby-container">
        <div className="pt-28 px-20">
          <RiskTipText className="mb-32">
            {t(
              'Before starting, please read and keep the following security points in mind'
            )}
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
                    'bg-white flex justify-between items-center px-12 py-16 border transition-colors',
                    'border-transparent hover:border-blue-light hover:bg-blue-light hover:bg-opacity-[0.1]'
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
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(RiskCheck);
