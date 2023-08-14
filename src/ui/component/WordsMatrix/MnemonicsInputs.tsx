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
import { isTryingToPaste } from '@/ui/utils/keyboard';

import './MnemonicsInputs.less';

const ITEM_H = 208 / 4;
const ROW_COUNT = 3;

const NumberFlag = styled.div`
  color: ${LessPalette['@color-comment-2']};
  font-weight: 400;
  font-size: 12px;
  height: 14px;
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

  ${styid(NumberFlag)} {
    position: absolute;
    top: 8px;
    left: 8px;
    color: #707280;
  }

  /* for MnemonicsInputs :start */
  .mnemonics-input {
    height: 100%;
    display: inline-block;
    line-height: ${ITEM_H}px;
    border-color: #f5f6fa;
    &:hover,
    &:focus,
    &.ant-input-focused {
      border-color: var(--brand-default, #7084ff);
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
  font-size: 12px;
  line-height: 14px;

  color: ${LessPalette['@color-body']};
`;

const HINT_BAR_H = 48;
const HintsAreaBar = styled.div`
  height: ${HINT_BAR_H}px;
  display: flex;
  bottom: 0;
  align-items: center;
  justify-content: flex-start;
  margin-left: -4px;
  margin-right: -4px;

  .work-item-box {
    width: ${(1 / 4) * 100}%;
    flex-shrink: 1;
    padding-left: 4px;
    padding-right: 4px;
    cursor: pointer;
  }

  .work-item {
    width: 100%;
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

const DFLT_FOCUSING = { index: -1, visible: false };
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
  const { wordPlaceHolders } = React.useMemo(() => {
    return {
      wordPlaceHolders: Array(mnemonicsCount).fill(undefined) as undefined[],
    };
  }, [mnemonicsCount]);

  const [focusing, setFocusing] = React.useState<{
    index: number;
    visible: boolean;
  }>({ ...DFLT_FOCUSING });

  const [inputTexts, _setInputTexts] = React.useState<string[]>(
    fillMatrix(value.split(' '), mnemonicsCount)
  );
  React.useEffect(() => {
    _setInputTexts(fillMatrix(value.split(' '), mnemonicsCount));
  }, [value, mnemonicsCount]);
  const verRef = React.useRef(0);
  const ver = `ver-${verRef.current}-${mnemonicsCount}`;
  const setInputTexts = React.useCallback(
    (vals: string[]) => {
      const words = fillMatrix(vals.slice(0, mnemonicsCount), mnemonicsCount);
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

      let newInputTexts = inputTexts.slice(0);
      for (let i = 0; i < words.length; i++) {
        newInputTexts[idx + i] = words[i];
      }

      newInputTexts = newInputTexts.slice(0, mnemonicsCount);
      setInputTexts(newInputTexts);

      if (focusing.index === idx) {
        setMnemonics(word);
      }
    },
    [focusing, inputTexts, mnemonicsCount]
  );

  const {
    currentHints,
    setMnemonics,
    isLastTypingWordFull,
  } = useTypingMnemonics();

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
                      I have a{' '}
                      <b style={{ color: 'var(--brand-default, #7084ff)' }}>
                        {count}
                      </b>
                      -word phrase
                    </div>
                  </Menu.Item>
                );
              })}
            </Menu>
          }
        >
          <div className="left flex items-center cursor-pointer">
            <span>I have a {mnemonicsCount}-word phrase</span>
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
        className={clsx(
          'rounded-[6px] bg-gray-bg text-center',
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
              className={clsx('matrix-word-item is-mnemonics-input bg-gray-bg')}
              onClick={() => {
                setFocusing({ index: idx, visible: isCurrentVisible });
                setMnemonics(word);
              }}
            >
              <DebouncedInput
                debounce={150}
                key={`word-input-${ver}-${word}-${idx}`}
                className={clsx(
                  'mnemonics-input px-[28px] bg-gray-bg',
                  isCurrentFocusing && 'ant-input-focused'
                )}
                type={isCurrentVisible ? 'text' : 'password'}
                value={word}
                autoFocus={isCurrentFocusing}
                onFocus={() => {
                  setFocusing({ index: idx, visible: isCurrentVisible });
                }}
                onKeyDownCapture={(e) => {
                  if (isTryingToPaste(e)) {
                    const input = e.target as HTMLInputElement;
                    input.select();
                  }
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
          className={
            'ant-form-item-explain ant-form-item-explain-error mt-[12px] pt-[0] min-h-0 text-[14px] absolute'
          }
        >
          <div role="alert">{errMsgs[0]}</div>
        </div>
      ) : null}
    </div>
  );
}

export default MnemonicsInputs;
