import React from 'react';
import styled, { css } from 'styled-components';
import { Dropdown, Menu, message } from 'antd';
import { wordlist } from '@scure/bip39/wordlists/english';

import LessPalette from 'ui/style/var-defs';
import { styid } from 'ui/utils/styled';

import IconCaretDown from './icon-caret-down.svg';
import IconClearAll from './icon-clear-all.svg';
import IconSuccess from 'ui/assets/success.svg';

import clsx from 'clsx';
import useTypingMnemonics from '@/ui/hooks/useTypingMnemonics';
import DebouncedInput from '../DebouncedInput';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';

import './MnemonicsInputs.less';
import { Trans, useTranslation } from 'react-i18next';
import { clearClipboard } from '@/ui/utils/clipboard';

const ITEM_H = 208 / 4;
const ROW_COUNT = 3;

const NumberFlag = styled.div`
  color: var(--r-neutral-title-1, #192945);
  font-weight: 500;
  font-size: 15px;
  height: 18px;
  line-height: 1;
`;

const MatrixWrapper = styled.div.withConfig<{
  rowCount?: number;
}>({
  shouldForwardProp: (prop, defaultValidatorFn) => {
    return !['rowCount'].includes(prop) && defaultValidatorFn(prop);
  },
})`
  background-color: var(--r-neutral-card-3, #f7fafc);
  display: flex;
  flex-wrap: wrap;

  .matrix-word-item {
    box-sizing: border-box;
    height: ${ITEM_H}px;
    text-align: center;
    display: block;

    font-size: 15px;
    font-weight: 500;
    color: ${LessPalette['@color-title']};
    position: relative;

    border-right: 1px solid ${LessPalette['@color-border']};
    border-bottom: 1px solid ${LessPalette['@color-border']};

    ${(props) => {
      const rowCount = props.rowCount || ROW_COUNT;
      return css`
        width: ${(1 / rowCount) * 100}%;

        &:nth-child(${rowCount}n) {
          border-right: 0;
        }

        &:nth-last-child(-n + ${rowCount}) {
          border-bottom: 0;
        }
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
    background-color: var(--r-neutral-card-3, #f7fafc);
    height: 100%;
    display: inline-block;
    line-height: ${ITEM_H}px;
    border-color: #f5f6fa;
    &:focus,
    &.ant-input-focused {
      border-color: var(--r-blue-default, #7084ff);
      background-color: var(--r-neutral-bg-1, #fff);
      box-shadow: 0px 4px 8px 0px rgba(0, 0, 0, 0.24);
    }
  }
  .matrix-word-item.invalid {
    .mnemonics-input {
      opacity: 1;
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

  color: ${LessPalette['@color-body']};
`;

const DFLT_FOCUSING = { index: -1, visible: false };
const DFLT_HOVERING = { index: -1, isHovering: false };
type IMnemonicsCount = 12 | 15 | 18 | 21 | 24;
const MNEMONICS_COUNTS: IMnemonicsCount[] = [12, 15, 18, 21, 24];

function MnemonicsInputs({
  className,
  rowCount = ROW_COUNT,
  value = '',
  onInputTextsChange,
  onChange,
  errMsgs = [],
  errorIndexes = [],
  ...props
}: React.PropsWithChildren<{
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
}>) {
  const [mnemonicsCount, setMnemonicsCount] = React.useState<IMnemonicsCount>(
    12
  );
  const [invalidWords, setInvalidWords] = React.useState<number[]>([]);
  const { wordPlaceHolders } = React.useMemo(() => {
    return {
      wordPlaceHolders: Array(mnemonicsCount).fill(undefined) as undefined[],
    };
  }, [mnemonicsCount]);

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

  React.useEffect(() => {
    const arr: number[] = [];
    for (let i = 0; i < inputTexts.length; i++) {
      if (inputTexts[i] && !wordlist.includes(inputTexts[i])) {
        arr.push(i);
      }
    }
    setInvalidWords(arr);
  }, [inputTexts]);

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

  return (
    <div className={clsx(!!errMsgs.length && 'with-error')}>
      <HeadToolbar className="mb-[8px]">
        <Dropdown
          trigger={['click']}
          overlay={
            <Menu className="mnemonics-input-menu py-8px rounded-[4px]">
              {MNEMONICS_COUNTS.map((count) => {
                return (
                  <Menu.Item
                    className="h-[38px] py-0 px-[8px] hover:bg-transparent"
                    key={`countSelector-${count}`}
                    style={{ color: LessPalette['@color-body'] }}
                    onClick={() => {
                      setMnemonicsCount(count);
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
                          {count}
                        </b>
                        -word phrase
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
              <Trans
                t={t}
                i18nKey="page.newAddress.seedPhrase.wordPhrase"
                values={{ count: mnemonicsCount }}
              >
                I have a <span>{mnemonicsCount}</span>-word phrase
              </Trans>
            </span>

            <img className="ml-[2px]" src={IconCaretDown} />
          </div>
        </Dropdown>
        <div
          className="right flex items-center cursor-pointer"
          onClick={() => {
            clearAll();
          }}
        >
          <img src={IconClearAll} />
          <span className="ml-[6px]">
            {t('page.newAddress.seedPhrase.clearAll')}
          </span>
        </div>
      </HeadToolbar>
      <MatrixWrapper
        className={clsx(
          'rounded-[6px] text-center',
          'border border-[#E1E5F2] border-solid',
          className
        )}
        rowCount={rowCount}
      >
        {wordPlaceHolders.map((_, idx) => {
          const word = inputTexts[idx] || '';
          const number = idx + 1;

          const isCurrentFocusing = focusing.index === idx;
          const isCurrentVisible = focusing.visible && focusing.index === idx;

          return (
            <div
              key={`word-item-${word}-${idx}`}
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
                overlayClassName="rectangle w-[max-content] top-[-29px]"
                title={word}
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
                    'mnemonics-input pl-[46px] pr-10',
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
                  }}
                  onPaste={(e) => {
                    clearClipboard();
                    message.success({
                      icon: (
                        <img src={IconSuccess} className="icon icon-success" />
                      ),
                      content: t('page.newAddress.seedPhrase.pastedAndClear'),
                      duration: 2,
                    });
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
      {errMsgs?.[0] || invalidWords.length > 0 ? (
        <div
          className={
            'ant-form-item-explain ant-form-item-explain-error mt-[12px] pt-[0] min-h-0 text-[14px]'
          }
        >
          {invalidWords.length > 0 && (
            <div role="alert" className="mb-8">
              {t('page.newAddress.seedPhrase.inputInvalidCount', {
                count: invalidWords.length.toString(),
              })}
            </div>
          )}
          {errMsgs?.[0] && <div role="alert">{errMsgs[0]}</div>}
        </div>
      ) : null}
    </div>
  );
}

export default MnemonicsInputs;
