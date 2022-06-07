import React, { useEffect } from 'react';
import { Form, FormInstance, Input } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

import { StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { useMedia } from 'react-use';
import LessPalette from 'ui/style/var-defs';
import { searchByPrefix } from 'ui/utils/smart-completion';
import useDebounceValue from 'ui/hooks/useDebounceValue';
import { connectStore, useRabbyDispatch } from '../../store';

const TipTextList = styled.ol`
  list-style-type: decimal;

  > li {
    font-weight: 400;
    color: ${LessPalette['@color-body']};
    line-height: 20px;
  }

  > li + li {
    margin-top: 4px;
  }
`;

const BAR_H = 48;

const TextAreaBar = styled.div`
  position: absolute;
  width: 100%;
  height: ${BAR_H}px;
  display: flex;
  bottom: 0;
  align-items: center;
  justify-content: flex-start;

  .work-item-box {
    width: ${(1 / 4) * 100}%;
    flex-shrink: 1;
    padding-left: 8px;
    padding-right: 8px;
    cursor: pointer;
  }

  .work-item {
    max-width: 80px;
    height: 36px;
    text-align: center;
    line-height: 36px;

    display: block;
    background-color: ${LessPalette['@color-bg']};
    border-radius: 4px;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

function isStrEnglish(w: string) {
  return /^([a-z]|[A-Z])+$/.test(w);
}
type IFormStates = {
  mnemonics: string;
};
function useTypingMnemonics(form: FormInstance<IFormStates>) {
  const [mnemonics, setMnemonics] = React.useState<string | null>('');
  const [currentWords, _setCurrentWords] = React.useState<string[]>([]);

  const debouncedMnemonics = useDebounceValue(mnemonics, 250);
  const { lastTypingWord } = React.useMemo(() => {
    const mnemonicsList = debouncedMnemonics?.split(' ') || [];
    const lastTypingWord = mnemonicsList.pop() || '';

    return { lastTypingWord };
  }, [debouncedMnemonics]);

  const setCurrentWords = React.useCallback(
    (val: string[]) => {
      form.setFields([
        {
          value: form.getFieldValue('mnemonics'),
          name: 'mnemonics',
          ...(lastTypingWord &&
            isStrEnglish(lastTypingWord) &&
            !val?.length && {
              errors: [
                lastTypingWord + ' is an illegal seed phrase, please check!',
              ],
            }),
        },
      ]);

      _setCurrentWords(val);
    },
    [lastTypingWord, form]
  );

  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const inputTimerRef = React.useRef<any>(null);

  const setLastMnemonicsPart = React.useCallback(
    (word) => {
      const parts = mnemonics?.split(' ') || [];
      parts.pop();
      parts.push(word);
      const nextVal = parts.join(' ') + ' ';
      setMnemonics(nextVal);
      form.setFieldsValue({ mnemonics: nextVal });

      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
      inputTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();

        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }, 200);

      return nextVal;
    },
    [mnemonics, form]
  );

  React.useEffect(() => {
    if (!lastTypingWord || !isStrEnglish(lastTypingWord)) {
      setCurrentWords([]);
      return;
    }

    const words = searchByPrefix(lastTypingWord);
    setCurrentWords([...(words || [])]);
  }, [lastTypingWord]);

  return {
    currentWords,
    setMnemonics,
    setLastMnemonicsPart,
    isLastTypingWordFull: currentWords.includes(lastTypingWord),
    inputRef,
  };
}

const ImportMnemonics = () => {
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm<IFormStates>();
  const { t } = useTranslation();
  const isWide = useMedia('(min-width: 401px)');
  const {
    setMnemonics,
    currentWords,
    setLastMnemonicsPart,
    isLastTypingWordFull,
    inputRef,
  } = useTypingMnemonics(form);

  const dispatch = useRabbyDispatch();

  const [run, loading] = useWalletRequest(wallet.generateKeyringWithMnemonic, {
    onSuccess(stashKeyringId) {
      dispatch.importMnemonics.switchKeyring({
        stashKeyringId: stashKeyringId ?? null,
      });
      history.push({
        pathname: '/popup/import/mnemonics-confirm',
        state: {
          stashKeyringId,
        },
      });
    },
    onError(err) {
      form.setFields([
        {
          name: 'mnemonics',
          errors: [
            err?.message || t('The seed phrase is invalid, please check!'),
          ],
        },
      ]);
    },
  });

  useEffect(() => {
    dispatch.importMnemonics.getMnemonicsCounterAsync();

    (async () => {
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache && cache.path === history.location.pathname) {
          form.setFieldsValue({
            ...cache.states,
            mnemonics: '',
          });
          setMnemonics(form.getFieldValue('mnemonics'));
        }
      }
    })();

    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  return (
    <StrayPageWithButton
      custom={isWide}
      className={clsx(isWide && 'rabby-stray-page')}
      spinning={loading}
      form={form}
      formProps={{
        onValuesChange: (states) => {
          setMnemonics(states.mnemonics);
          wallet.setPageStateCache({
            path: history.location.pathname,
            params: {},
            states,
          });
        },
      }}
      onSubmit={({ mnemonics }) => run(mnemonics.trim())}
      hasBack
      hasDivider
      noPadding
      onBackClick={() => {
        if (history.length > 1) {
          history.goBack();
        } else {
          history.replace('/');
        }
      }}
      backDisabled={false}
    >
      <header className="create-new-header import-mnemonics-header h-[60px] leading-[60px] py-0">
        <h2 className="text-20 mb-0 mt-0 text-white text-center font-medium">
          {t('Import Seed Phrase')}
        </h2>
      </header>
      <div className="rabby-container">
        <div className="pt-32 px-20">
          <div className="relative">
            <Form.Item
              name="mnemonics"
              rules={[
                { required: true, message: t('Please input Seed Phrase') },
              ]}
            >
              <Input.TextArea
                className={`h-[128px] p-16 pb-${BAR_H}`}
                placeholder={t('Enter your Seed Phrase, distinguish by space')}
                spellCheck={false}
                ref={inputRef}
                autoFocus
              />
            </Form.Item>
            {!isLastTypingWordFull && (
              <TextAreaBar>
                {currentWords.map((word, idx) => {
                  return (
                    <div
                      key={`word-${word}-${idx}`}
                      className="work-item-box"
                      onClick={() => {
                        setLastMnemonicsPart(word);
                      }}
                    >
                      <span className="work-item">{word}</span>
                    </div>
                  );
                })}
              </TextAreaBar>
            )}
          </div>
          <TipTextList className="text-14 pl-20 mt-35">
            <li>
              The seed phrase you import will only be stored on the front end of
              your browser and will not be uploaded to Rabby's servers.
            </li>
            <li>
              After you uninstall Rabby or uninstall your browser, the seed
              phrase will be deleted and Rabby cannot help you recover them.
            </li>
          </TipTextList>
        </div>
      </div>
    </StrayPageWithButton>
  );
};

export default connectStore()(ImportMnemonics);
