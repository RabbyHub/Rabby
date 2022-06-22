import React from 'react';
import styled, { css } from 'styled-components';
import { Dropdown, Menu } from 'antd';

import LessPalette from 'ui/style/var-defs';
import { styid } from 'ui/utils/styled';

import IconEyeHide from './icon-eye-close.svg';
import IconEye from './icon-eye-open.svg';
import IconCaretDown from './icon-caret-down.svg';
import IconClearAll from './icon-clear-all.svg';

import clsx from 'clsx';
import useTypingMnemonics from '@/ui/hooks/useTypingMnemonics';
import DebouncedInput from '../DebouncedInput';

const ITEM_H = 208 / 4;
const ROW_COUNT = 3;

const NumberFlag = styled.div`
  color: ${LessPalette['@color-comment-2']};
  font-weight: 400;
  font-size: 12px;
  height: 14px;
`;

const FocusingBox = styled.div`
  border: 1px solid ${LessPalette['@primary-color']};
  border-radius: 6px;
`;

const ErrorBox = styled(FocusingBox)`
  border-color: ${LessPalette['@error-color']};
`;

const MatrixWrapper = styled.div.withConfig<{
  rowCount?: number;
}>({
  shouldForwardProp: (prop, defaultValidatorFn) => {
    return !['rowCount'].includes(prop) && defaultValidatorFn(prop);
  },
})`
  display: flex;
  flex-wrap: wrap;
  overflow: hidden;

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
  }

  ${styid(FocusingBox)}, ${styid(ErrorBox)} {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
  }

  ${styid(NumberFlag)} {
    position: absolute;
    top: 8px;
    left: 8px;
  }

  /* for MnemonicsInputs :start */
  .mnemonics-input {
    height: 100%;
    display: inline-block;
    line-height: ${ITEM_H}px;
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
    z-index: 11;

    > img {
      width: 12px;
      height: 12px;
    }
  }

  .matrix-word-item:hover .visible-switch-icon-wrapper {
    visibility: visible;
  }

  .matrix-word-item.is-mnemonics-input ${styid(NumberFlag)} {
    z-index: 11;
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
  font-size: 12px;
  line-height: 14px;

  color: ${LessPalette['@color-body']};
`;

const HINT_BAR_H = 48;
const HintsAreaBar = styled.div`
  // position: absolute;
  width: 100%;
  height: ${HINT_BAR_H}px;
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
    background-color: white;
    border-radius: 4px;

    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const DFLT_FOCUSING = { index: 0, visible: false };
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
  const { words, wordPlaceHolders } = React.useMemo(() => {
    return {
      words: value.split(' ').slice(0, mnemonicsCount),
      wordPlaceHolders: Array(mnemonicsCount).fill(undefined) as undefined[],
    };
  }, [value, mnemonicsCount]);

  const [inputTexts, _setInputTexts] = React.useState<string[]>(
    fillMatrix(words, mnemonicsCount)
  );
  const setInputTexts = React.useCallback(
    (vals: string[]) => {
      const words = vals.slice(0, mnemonicsCount);
      _setInputTexts(words);
      onChange?.(words.join(' '));
    },
    [onChange, mnemonicsCount]
  );
  const [focusing, setFocusing] = React.useState<{
    index: number;
    visible: boolean;
  }>({ ...DFLT_FOCUSING });

  const clearAll = React.useCallback(() => {
    setInputTexts(fillMatrix([], mnemonicsCount));
    setFocusing({ ...DFLT_FOCUSING });
  }, [mnemonicsCount]);

  const onWordUpdated = React.useCallback(
    (idx: number, word: string) => {
      const words = word.split(' ');
      let newInputTexts = inputTexts.slice(0, idx);
      for (let i = 0, flag = i + idx; i < words.length; i++) {
        flag = i + idx;
        if (flag >= mnemonicsCount) break;
        newInputTexts[flag] = inputTexts[flag] || words[i];
      }
      if (newInputTexts.length < mnemonicsCount) {
        newInputTexts = newInputTexts.concat(
          inputTexts.slice(newInputTexts.length)
        );
      }

      newInputTexts = newInputTexts.slice(0, mnemonicsCount);

      setInputTexts(newInputTexts);
    },
    [inputTexts, mnemonicsCount]
  );

  const {
    currentHints,
    setMnemonics,
    isLastTypingWordFull,
  } = useTypingMnemonics();

  return (
    <div className={clsx(!!errMsgs.length && 'with-error')}>
      <HeadToolbar className="mb-[12px]">
        <Dropdown
          trigger={['click']}
          overlay={
            <Menu>
              {MNEMONICS_COUNTS.map((count) => {
                return (
                  <Menu.Item
                    key={`countSelector-${count}`}
                    style={{ color: LessPalette['@color-body'] }}
                    onClick={() => {
                      setMnemonicsCount(count);
                    }}
                  >
                    I have{' '}
                    <b style={{ color: LessPalette['@primary-color'] }}>
                      {count}
                    </b>{' '}
                    Seed Phrase
                  </Menu.Item>
                );
              })}
            </Menu>
          }
        >
          <div className="left flex items-center cursor-pointer">
            <span>I have {mnemonicsCount} Seed Phrase</span>
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
          <span className="ml-[6px]">Clear All</span>
        </div>
      </HeadToolbar>
      <MatrixWrapper
        className={clsx('rounded-[6px] bg-white text-center', className)}
        rowCount={rowCount}
      >
        {wordPlaceHolders.map((_, idx) => {
          const word = inputTexts[idx] || '';
          const number = idx + 1;
          const errored = errorIndexes.includes(idx);

          const isCurrentVisible = focusing.visible && focusing.index === idx;

          return (
            <div
              key={`word-item-${word}-${idx}`}
              className={clsx('matrix-word-item is-mnemonics-input')}
              onClick={() => {
                setFocusing({ index: idx, visible: isCurrentVisible });
              }}
            >
              {!errored && focusing.index === idx && <FocusingBox />}
              {errored && <ErrorBox />}
              <DebouncedInput
                className="mnemonics-input px-[28px]"
                type={isCurrentVisible ? 'text' : 'password'}
                value={word}
                autoFocus={focusing.index === idx}
                onChange={(text) => {
                  const newVal = text.trim();
                  setMnemonics(newVal);
                  if (newVal === word) return;

                  onWordUpdated(idx, newVal);
                }}
              />
              <NumberFlag>{number}.</NumberFlag>
              <div
                className="visible-switch-icon-wrapper"
                onClick={(evt) => {
                  evt.stopPropagation();
                  setFocusing({ index: idx, visible: !isCurrentVisible });
                }}
              >
                <img src={isCurrentVisible ? IconEye : IconEyeHide} />
              </div>
            </div>
          );
        })}
      </MatrixWrapper>
      {errMsgs?.[0] ? (
        <div
          className={`ant-form-item-explain ant-form-item-explain-error mt-[12px] pt-[0] h-[${HINT_BAR_H}px]`}
        >
          <div role="alert">{errMsgs[0]}</div>
        </div>
      ) : (
        <HintsAreaBar className="mt-[12px]">
          {!isLastTypingWordFull &&
            currentHints.map((word, idx) => {
              return (
                <div
                  key={`word-${word}-${idx}`}
                  className="work-item-box"
                  onClick={() => {
                    if (focusing.index < 0) return;
                    const newInputTexts = inputTexts.slice();
                    newInputTexts[focusing.index] = word;
                    setInputTexts(newInputTexts);
                  }}
                >
                  <span className="work-item">{word}</span>
                </div>
              );
            })}
        </HintsAreaBar>
      )}
    </div>
  );
}

export default MnemonicsInputs;
