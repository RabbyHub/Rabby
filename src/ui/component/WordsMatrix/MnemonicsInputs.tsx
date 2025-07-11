import React, { useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { Dropdown, Input, Menu, message } from 'antd';
import { wordlist } from '@scure/bip39/wordlists/english';

import { styid } from 'ui/utils/styled';

import IconCaretDown from './icon-caret-down.svg';
import { ReactComponent as RcIconClearAll } from './icon-clear-all.svg';
import IconSuccess from 'ui/assets/success.svg';

import clsx from 'clsx';
import useTypingMnemonics from '@/ui/hooks/useTypingMnemonics';
import DebouncedInput from '../DebouncedInput';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';

import './MnemonicsInputs.less';
import { Trans, useTranslation } from 'react-i18next';
import { clearClipboard } from '@/ui/utils/clipboard';
import ThemeIcon from '../ThemeMode/ThemeIcon';

import { ReactComponent as RcIconArrowCC } from '@/ui/assets/import/arrow-cc.svg';
import { ReactComponent as RcIconSwipeCC } from '@/ui/assets/import/swipe-cc.svg';

const ITEM_H = 40;
const ROW_COUNT = 3;
const DEFAULT_MEMONICS_COUNT = 12;

const NumberFlag = styled.div`
  color: var(--r-neutral-body);
  font-weight: 400;
  font-size: 10px;
  line-height: 12px;
  height: 12px;
`;

const useClearClipboardToast = () => {
  const { t } = useTranslation();

  const clearClipboardToast = () => {
    clearClipboard();
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.newAddress.seedPhrase.pastedAndClear'),
      duration: 2,
    });
  };

  return clearClipboardToast;
};

const MatrixWrapper = styled.div.withConfig<{
  rowCount?: number;
  totalCount?: number;
}>({
  shouldForwardProp: (prop, defaultValidatorFn) => {
    return !['rowCount'].includes(prop) && defaultValidatorFn(prop);
  },
})`
  background-color: var(--r-neutral-card-3, #f7fafc);
  display: flex;
  flex-wrap: wrap;

  &.new-user-import {
    background-color: transparent;
    gap: 8px;
    .matrix-word-item {
      width: calc(calc(100% - 16px) / 3);
      border-color: transparent;

      .mnemonics-input {
        background-color: rgba(217, 217, 217, 0.2);
        border-radius: 8px;
        border: 1.5px solid var(--r-neutral-line, #e0e5ec);
        text-align: center;
        font-size: 22px;
        color: var(--r-neutral-title-1, #192945);
        &:hover {
          border-color: var(--r-blue-default, #7084ff);
        }
        &:focus,
        &.ant-input-focused {
          box-shadow: none;
        }
      }

      &:not(.invalid) {
        .mnemonics-input:hover {
          border-color: var(--r-blue-default, #7084ff);
          border-right-width: 1.5px !important;
        }
      }

      ${styid(NumberFlag)} {
        top: 6px;
        left: 8px;
        color: var(--r-neutral-body, #3e495e);
        font-size: 10px;
        line-height: 12px;
        font-style: normal;
        font-weight: 400;
      }
    }
    .matrix-word-item.invalid {
      ${styid(NumberFlag)} {
        color: var(--r-red-default, #e34935);
      }
    }
  }

  .matrix-word-item {
    box-sizing: border-box;
    height: ${ITEM_H}px;
    text-align: center;
    display: block;

    font-size: 15px;
    font-weight: 500;
    color: var(--r-neutral-title-1);
    position: relative;

    border-right: 1px solid var(--r-neutral-line);
    border-bottom: 1px solid var(--r-neutral-line);

    ${(props) => {
      const rowCount = props.rowCount || ROW_COUNT;
      const totalCount = props.totalCount || DEFAULT_MEMONICS_COUNT;

      return css`
        width: ${(1 / rowCount) * 100}%;

        &:nth-child(${rowCount}n) {
          border-right: 0;
        }

        &:nth-last-child(-n + ${rowCount}) {
          border-bottom: 0;
        }

        // &:nth-child(1) .mnemonics-input {
        //   border-top-left-radius: 6px;
        // }
        // &:nth-child(${rowCount}) .mnemonics-input {
        //   border-top-right-radius: 6px;
        // }
        // &:nth-child(${totalCount - rowCount + 1}) .mnemonics-input {
        //   border-bottom-left-radius: 6px;
        // }
        // &:nth-child(${totalCount}) .mnemonics-input {
        //   border-bottom-right-radius: 6px;
        // }
        // &:not(.invalid):nth-child(-n + ${rowCount}) .mnemonics-input:not(:focus) {
        //   border-top: 1px solid var(--r-neutral-line);
        // }
        // &:not(.invalid):nth-child(${rowCount}n+1) .mnemonics-input:not(:focus) {
        //   border-left: 1px solid var(--r-neutral-line);
        // }
      `;
    }}

    &:hover {
      .mnemonics-input,
      ${styid(NumberFlag)} {
        opacity: 1 !important;
      }
    }
  }

  ${styid(NumberFlag)} {
    position: absolute;
    top: 17px;
    left: 8px;
  }

  /* for MnemonicsInputs :start */
  .mnemonics-input {
    background-color: transparent;
    color: var(--r-neutral-title-1, #192945);
    height: 100%;
    display: inline-block;
    line-height: ${ITEM_H}px;
    border-color: transparent;
    border-radius: 6px;

    &:focus,
    &.ant-input-focused {
      border-color: var(--r-blue-default, #7084ff);
      border-width: 1.5px;
      border-right-width: 1.5px !important;
      background-color: var(--r-neutral-bg-1, #fff);
      box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.24);
    }
  }
  .matrix-word-item.invalid {
    .mnemonics-input {
      opacity: 1;
      border-width: 1.5px;
      border-color: var(--r-red-default, #e34935);
    }
    ${styid(NumberFlag)} {
      color: var(--r-red-default, #e34935);
    }
  }
  .visible-switch-icon-wrapper {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    right: 0;
    display: flex;
    justify-content: flex-start;
    align-items: flex-end;
    cursor: pointer;
    visibility: hidden;
    z-index: 9;

    > img {
      width: 12px;
      height: 12px;
    }
  }

  .matrix-word-item:hover .visible-switch-icon-wrapper {
    visibility: visible;
  }

  .matrix-word-item.is-mnemonics-input ${styid(NumberFlag)} {
    z-index: 9;
  }
  /* for MnemonicsInputs :end */
`;

function fillMatrix(words: string[], mnemonicsCount: number) {
  const matrix = words.slice() as string[];
  while (matrix.length < mnemonicsCount) {
    matrix.push('');
  }

  return matrix;
}

const HeadToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 400;
  font-size: 13px;
  line-height: 14px;

  color: var(--r-neutral-body);
`;

const DFLT_FOCUSING = { index: -1, visible: false };
const DFLT_HOVERING = { index: -1, isHovering: false };
type IMnemonicsCount = 12 | 15 | 18 | 21 | 24;
const MNEMONICS_COUNTS: IMnemonicsCount[] = [12, 15, 18, 21, 24];
const NEED_PASSPHRASE_MNEMONICS_COUNTS: IMnemonicsCount[] = [
  12,
  15,
  18,
  21,
  24,
];

const SLIP39_MNEMONICS_COUNTS: { passphrase: boolean }[] = [
  { passphrase: false },
  { passphrase: true },
];

function MnemonicsInputs({
  newUserImport,
  className,
  rowCount = ROW_COUNT,
  value = '',
  onInputTextsChange,
  onChange,
  errMsgs = [],
  errorIndexes = [],
  onPassphrase,
  isSlip39,
  onSlip39Change,
  slip39GroupNumber,
  setSlip39GroupNumber,
  ...props
}: React.PropsWithChildren<{
  newUserImport?: boolean;
  className?: string;
  rowCount?: number;
  value?: string;
  onInputTextsChange?: (payload: {
    words: string[];
    text: string;
    mnemonicsCount: number;
  }) => any;
  onChange?: (value: string) => any;
  errMsgs?: string[];
  errorIndexes?: number[];
  onPassphrase?: (val: boolean) => any;
  isSlip39: boolean;
  onSlip39Change: React.Dispatch<React.SetStateAction<boolean>>;
  slip39GroupNumber: number;
  setSlip39GroupNumber: React.Dispatch<React.SetStateAction<number>>;
}>) {
  const [mnemonicsCount, setMnemonicsCount] = React.useState<IMnemonicsCount>(
    DEFAULT_MEMONICS_COUNT
  );
  const [needPassphrase, setNeedPassphrase] = React.useState<boolean>(false);

  const [invalidWords, setInvalidWords] = React.useState<number[]>([]);
  const { wordPlaceHolders } = React.useMemo(() => {
    return {
      wordPlaceHolders: Array(mnemonicsCount).fill(undefined) as undefined[],
    };
  }, [mnemonicsCount]);

  const [sli39values, onSli39valuesChange] = React.useState<string[]>([]);

  const [focusing, setFocusing] = React.useState<{
    index: number;
    visible: boolean;
  }>({ ...DFLT_FOCUSING });

  const [hovering, setHovering] = React.useState<{
    index: number;
    isHovering: boolean;
  }>(DFLT_HOVERING);

  const [inputTexts, _setInputTexts] = React.useState<string[]>(
    fillMatrix(value.split(' '), mnemonicsCount)
  );
  React.useEffect(() => {
    _setInputTexts(fillMatrix(value.split(' '), mnemonicsCount));
  }, [value, mnemonicsCount]);
  const verRef = React.useRef(0);
  const ver = `ver-${verRef.current}-${mnemonicsCount}`;
  const setInputTexts = React.useCallback(
    (vals: string[], noSlice = false) => {
      const words = fillMatrix(
        noSlice ? vals : vals.slice(0, mnemonicsCount),
        mnemonicsCount
      );
      _setInputTexts(words);
      onChange?.(words.join(' '));
      verRef.current++;
    },
    [onChange, mnemonicsCount]
  );

  const hasInputValue = useMemo(() => {
    return value?.trim?.()?.length > 0;
  }, [inputTexts]);

  React.useEffect(() => {
    setFocusing({
      index: 0,
      visible: false,
    });
  }, []);

  const clearAll = React.useCallback(() => {
    setInputTexts([]);
    setFocusing({ ...DFLT_FOCUSING });
    setMnemonics('');
    validateWords();
    onSli39valuesChange(['']);
    setSlip39GroupNumber(1);
  }, [mnemonicsCount]);

  const onWordUpdated = React.useCallback(
    (idx: number, word: string) => {
      const words = word.split(' ');
      const totalCount = idx + words.length;
      let nextCount: IMnemonicsCount | undefined = mnemonicsCount;
      if (totalCount > mnemonicsCount) {
        nextCount = MNEMONICS_COUNTS.find((c) => c >= totalCount);
        if (nextCount) {
          setMnemonicsCount(nextCount);
        } else {
          nextCount = MNEMONICS_COUNTS[MNEMONICS_COUNTS.length - 1];
          setMnemonicsCount(MNEMONICS_COUNTS[MNEMONICS_COUNTS.length - 1]); // use max
        }
      }
      let newInputTexts = inputTexts.slice(0);
      for (let i = 0; i < words.length; i++) {
        newInputTexts[idx + i] = words[i];
      }
      newInputTexts = newInputTexts.slice(0, nextCount);
      setInputTexts(newInputTexts, true);

      if (focusing.index === idx) {
        setMnemonics(word);
      }
    },
    [focusing, inputTexts, mnemonicsCount]
  );

  const validateWords = () => {
    const arr: number[] = [];
    for (let i = 0; i < inputTexts.length; i++) {
      if (inputTexts[i] && !wordlist.includes(inputTexts[i])) {
        arr.push(i);
      }
    }
    setInvalidWords(arr);
  };

  const { setMnemonics } = useTypingMnemonics();
  const { t } = useTranslation();

  const handleMouseEnter = (index: number) => {
    setTimeout(() => {
      setHovering({
        index,
        isHovering: true,
      });
    }, 0);
  };

  const handleMouseLeave = (index: number) => {
    setTimeout(() => {
      if (hovering.index === index) {
        setHovering({
          index,
          isHovering: false,
        });
      }
    }, 0);
  };

  React.useEffect(() => {
    onPassphrase?.(needPassphrase);
  }, [needPassphrase]);

  const clearClipboardToast = useClearClipboardToast();

  return (
    <div className={clsx(!!errMsgs.length && 'with-error')}>
      <HeadToolbar className="mb-[20px] text-r-neutral-body">
        <Dropdown
          trigger={['click']}
          overlay={
            <Menu className="mnemonics-input-menu py-8px rounded-[4px]">
              {MNEMONICS_COUNTS.map((count) => {
                return (
                  <Menu.Item
                    className="h-[38px] py-0 px-[8px] text-r-neutral-body hover:bg-transparent"
                    key={`countSelector-${count}`}
                    onClick={() => {
                      setMnemonicsCount(count);
                      setNeedPassphrase(false);
                      onSlip39Change(false);
                    }}
                  >
                    <div className="text-wrapper">
                      <Trans
                        t={t}
                        i18nKey="page.newAddress.seedPhrase.wordPhrase"
                        values={{ count }}
                      >
                        I have a
                        <b style={{ color: 'var(--r-blue-default, #7084ff)' }}>
                          {{ count }}
                        </b>
                        -word phrase
                      </Trans>
                    </div>
                  </Menu.Item>
                );
              })}
              {NEED_PASSPHRASE_MNEMONICS_COUNTS.map((count) => {
                return (
                  <Menu.Item
                    className="h-[38px] py-0 px-[8px] hover:bg-transparent"
                    key={`countSelector-need-passphrase-${count}`}
                    style={{ color: 'var(--r-neutral-body)' }}
                    onClick={() => {
                      setMnemonicsCount(count);
                      setNeedPassphrase(true);
                      onSlip39Change(false);
                    }}
                  >
                    <div className="text-wrapper">
                      <Trans
                        t={t}
                        i18nKey="page.newAddress.seedPhrase.wordPhraseAndPassphrase"
                        values={{ count }}
                      >
                        I have a
                        <b style={{ color: 'var(--r-blue-default, #7084ff)' }}>
                          {{ count }}
                        </b>
                        -word phrase and Passphrase
                      </Trans>
                    </div>
                  </Menu.Item>
                );
              })}

              {SLIP39_MNEMONICS_COUNTS.map(({ passphrase }) => {
                return (
                  <Menu.Item
                    className="h-[38px] py-0 px-[8px] hover:bg-transparent"
                    key={`countSelector-need-passphrase-${passphrase}`}
                    style={{ color: 'var(--r-neutral-body)' }}
                    onClick={() => {
                      onSlip39Change(true);
                      setNeedPassphrase(passphrase);
                    }}
                  >
                    <div className="text-wrapper">
                      <Trans
                        t={t}
                        i18nKey={
                          passphrase
                            ? 'page.newAddress.seedPhrase.slip39SeedPhraseWithPassphrase'
                            : 'page.newAddress.seedPhrase.slip39SeedPhrase'
                        }
                        values={{ SLIP39: 'SLIP 39' }}
                      >
                        <b
                          style={{ color: 'var(--r-blue-default, #7084ff)' }}
                        ></b>
                      </Trans>
                    </div>
                  </Menu.Item>
                );
              })}
            </Menu>
          }
        >
          <div className="left flex items-center cursor-pointer">
            <span>
              {!isSlip39 ? (
                <Trans
                  t={t}
                  i18nKey={
                    needPassphrase
                      ? 'page.newAddress.seedPhrase.wordPhraseAndPassphrase'
                      : 'page.newAddress.seedPhrase.wordPhrase'
                  }
                  values={{ count: mnemonicsCount }}
                >
                  I have a <span>{{ mnemonicsCount }}</span>-word phrase and
                  Passphrase
                </Trans>
              ) : (
                <Trans
                  t={t}
                  i18nKey={
                    needPassphrase
                      ? 'page.newAddress.seedPhrase.slip39SeedPhraseWithPassphrase'
                      : 'page.newAddress.seedPhrase.slip39SeedPhrase'
                  }
                  values={{ SLIP39: 'SLIP 39' }}
                >
                  <span />
                </Trans>
              )}
            </span>

            {newUserImport ? (
              <RcIconArrowCC
                className="ml-[2px] text-r-neutral-body w-16 h-16"
                viewBox="0 0 16 16"
              />
            ) : (
              <img className="ml-[2px]" src={IconCaretDown} />
            )}
          </div>
        </Dropdown>
        {hasInputValue && (
          <div
            className={clsx(
              'right flex items-center cursor-pointer',
              newUserImport &&
                'min-w-max pb-[2px] hover:bg-r-blue-disable rounded-[1px]'
            )}
            onClick={() => {
              clearAll();
            }}
          >
            <RcIconClearAll
              viewBox="0 0 18 18"
              className="w-[18px] h-[18px] text-rabby-blue-default"
            />
            {!newUserImport && (
              <span className="ml-[6px]">
                {t('page.newAddress.seedPhrase.clearAll')}
              </span>
            )}
          </div>
        )}
      </HeadToolbar>
      <MatrixWrapper
        className={clsx(
          'rounded-[6px] text-center',
          !newUserImport && 'border border-rabby-neutral-line border-solid',
          isSlip39 && 'hidden',
          newUserImport && 'new-user-import',
          className
        )}
        rowCount={rowCount}
        totalCount={mnemonicsCount}
      >
        {wordPlaceHolders.map((_, idx) => {
          const word = inputTexts[idx] || '';
          const number = idx + 1;

          const isCurrentFocusing = focusing.index === idx;
          const isCurrentVisible = focusing.visible && focusing.index === idx;

          return (
            <div
              key={`word-item-${idx}`}
              className={clsx('matrix-word-item is-mnemonics-input', {
                invalid: invalidWords.includes(idx),
              })}
              onClick={() => {
                setFocusing({ index: idx, visible: isCurrentVisible });
                setMnemonics(word);
              }}
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseLeave={() => handleMouseLeave(idx)}
            >
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content] top-[-20px]"
                title={word}
                disableLeft
                placement="top"
                visible={
                  !!(
                    word &&
                    (focusing.index === idx ||
                      (hovering.index === idx && hovering.isHovering))
                  )
                }
              >
                <DebouncedInput
                  debounce={150}
                  key={`word-input-${ver}-${word}-${idx}`}
                  className={clsx(
                    'mnemonics-input  pr-10',
                    newUserImport ? 'pl-[10px]' : 'pl-[46px]',
                    isCurrentFocusing && 'ant-input-focused',
                    {
                      'opacity-50':
                        focusing.index !== -1 && focusing.index !== idx,
                    }
                  )}
                  type={isCurrentVisible ? 'text' : 'password'}
                  value={word}
                  autoFocus={isCurrentFocusing}
                  onFocus={() => {
                    setFocusing({ index: idx, visible: isCurrentVisible });
                  }}
                  onBlur={() => {
                    setFocusing(DFLT_FOCUSING);
                    validateWords();
                  }}
                  onPaste={(e) => {
                    clearClipboardToast();
                    const input = e.target as HTMLInputElement;
                    input.select();
                  }}
                  onContextMenu={(e) => {
                    const input = e.target as HTMLInputElement;
                    input.select();
                  }}
                  onChange={(text: string) => {
                    const newVal = text.trim();

                    if (newVal === word) return;

                    onWordUpdated(idx, newVal);
                  }}
                />
              </TooltipWithMagnetArrow>
              <NumberFlag
                className={clsx({
                  'opacity-50': focusing.index !== -1 && focusing.index !== idx,
                })}
              >
                {number}.
              </NumberFlag>
            </div>
          );
        })}
      </MatrixWrapper>

      {isSlip39 && (
        <SLIP39MnemonicsInputs
          sli39values={sli39values}
          onSli39valuesChange={onSli39valuesChange}
          onChange={onChange}
          error={!!errMsgs?.[0]}
          groupNumber={slip39GroupNumber}
          errorIndexes={errorIndexes}
        />
      )}
      {errMsgs?.[0] || invalidWords.length > 0 ? (
        <div
          className={
            'ant-form-item-explain ant-form-item-explain-error text-r-red-default mt-[14px] pt-[0] min-h-0 text-[13px]'
          }
        >
          {invalidWords.length > 0 && (
            <div role="alert" className="mb-8">
              {t('page.newAddress.seedPhrase.inputInvalidCount', {
                count: invalidWords.length,
              })}
            </div>
          )}
          {errMsgs?.[0] && <div role="alert">{errMsgs[0]}</div>}
        </div>
      ) : null}
    </div>
  );
}

const SLIP39MnemonicsInput = ({
  value,
  onTextChange,
  idx,
  error,
  onPaste,
}: {
  value: string;
  onTextChange: (text: string) => void;
  idx: number;
  error?: boolean;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative ">
      <Input
        type={'password'}
        key={`slip39-seed-phrase-${idx}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        onPaste={onPaste}
        className={clsx(
          'h-[56px] border-rabby-neutral-line bg-rabby-neutral-card-1 ',
          'text-15 text-r-neutral-title-1 font-normal leading-[18px]',
          error ? 'border-rabby-red-default' : '',
          'placeholder-shown:text-r-neutral-foot placeholder-shown:text-14 focus:border-blue'
        )}
        spellCheck={false}
        placeholder={t(
          'page.newAddress.seedPhrase.slip39SeedPhrasePlaceholder',
          { count: idx + 1, ordinal: true }
        )}
        value={value}
        onChange={(e) => {
          onTextChange(e.target.value);
        }}
      />
    </div>
  );
};

export const SLIP39MnemonicsInputs = ({
  onChange,
  groupNumber: number = 1,
  error,
  sli39values,
  onSli39valuesChange,
  errorIndexes = [],
}: {
  error?: boolean;
  onChange?: (value: string) => any;
  groupNumber?: number;
  sli39values: string[];
  onSli39valuesChange: React.Dispatch<React.SetStateAction<string[]>>;
  errorIndexes: number[];
}) => {
  const clearClipboardToast = useClearClipboardToast();

  useEffect(() => {
    onSli39valuesChange((pre) =>
      Array.from({ length: number }).map((_, idx) => pre[idx] || '')
    );
  }, [number]);

  return (
    <div className="space-y-16">
      {sli39values.map((_, idx) => (
        <SLIP39MnemonicsInput
          key={`slip39-seed-phrase-${idx}`}
          idx={idx}
          value={sli39values[idx]}
          error={error && errorIndexes.includes(idx)}
          onPaste={(e) => {
            clearClipboardToast();

            e.preventDefault();
            const text = e.clipboardData.getData('text');
            onSli39valuesChange((prev) => {
              const newVal = [...prev];
              const arr = text.split('\n').filter((t) => t);
              for (let i = 0; i < arr.length; i++) {
                newVal[idx + i] = arr[i];
              }
              onChange?.(newVal.join('\n'));
              return newVal;
            });
          }}
          onTextChange={(text) => {
            onSli39valuesChange((pre) => {
              const newVal = [...pre];
              newVal[idx] = text;
              onChange?.(newVal.join('\n'));
              return newVal;
            });
          }}
        />
      ))}
    </div>
  );
};

export default MnemonicsInputs;
