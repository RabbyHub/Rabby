import React from 'react';
import styled, { css } from 'styled-components';
import clsx from 'clsx';

import { styid } from 'ui/utils/styled';

import IconCloseSvg from 'ui/assets/close-icon.svg';

import MnemonicsInputs from './MnemonicsInputs';

const ITEM_H = 208 / 4;
const ROW_COUNT = 3;

const NumberFlag = styled.div`
  color: var(--r-neutral-foot);
  font-weight: 400;
  font-size: 12px;
  height: 14px;
`;

const CloseIcon = styled.img.attrs({
  src: IconCloseSvg,
})`
  width: 8px;
  height: 8px;
  cursor: pointer;
`;

const FocusingBox = styled.div`
  border: 1px solid var(--r-blue-default, #7084ff);
  border-radius: 6px;
`;

const ErrorBox = styled(FocusingBox)`
  border-color: var(--r-red-default);
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
    color: var(--r-neutral-title-1);
    position: relative;

    border-right: 1px solid var(--r-neutral-line);
    border-bottom: 1px solid var(--r-neutral-line);
    border-right: 0.5px solid var(--r-neutral-line);
    border-bottom: 0.5px solid var(--r-neutral-line);

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

  .text {
    height: 100%;
    display: inline-block;
    line-height: ${ITEM_H}px;
  }

  ${styid(NumberFlag)} {
    position: absolute;
    top: 8px;
    left: 8px;
  }

  .close-icon-wrapper {
    position: absolute;
    width: 12px;
    height: 12px;
    top: 8px;
    right: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }
`;

function WordsMatrix({
  className,
  rowCount = ROW_COUNT,
  words = [],
  focusable = true,
  focusingIndex = -1,
  onFocusWord,
  errorIndexes = [],
  closable = true,
  onCloseWord,
}: React.PropsWithChildren<{
  className?: string;
  rowCount?: number;
  words?: string[];
  errorIndexes?: number[];
  focusable?: boolean;
  focusingIndex?: number;
  onFocusWord?: (_: { word: string; index: number }) => any;
  closable?: boolean;
  onCloseWord?: (_: { word: string; index: number }) => any;
}>) {
  const [checkedWords, setCheckedWords] = React.useState<string[]>(
    words.slice()
  );

  React.useEffect(() => {
    setCheckedWords(words.slice());
  }, [words]);

  return (
    <MatrixWrapper
      className={clsx('rounded-[6px] bg-white text-center', className)}
      rowCount={rowCount}
    >
      {checkedWords.map((word, idx) => {
        const number = idx + 1;
        const clearable = closable && !!word.trim();
        const errored = errorIndexes.includes(idx);

        return (
          <div
            key={`word-item-${word}-${idx}`}
            className={clsx('matrix-word-item')}
            onClick={() => {
              if (focusable) {
                onFocusWord?.({ word: word, index: idx });
              }
            }}
          >
            {!errored && focusingIndex === idx && <FocusingBox />}
            {errored && <ErrorBox />}
            <NumberFlag>{number}.</NumberFlag>
            <span className="text">{word}</span>

            {clearable && (
              <div
                className="close-icon-wrapper"
                onClick={(evt) => {
                  onCloseWord?.({ word: word, index: idx });
                  evt.stopPropagation();
                }}
              >
                <CloseIcon />
              </div>
            )}
          </div>
        );
      })}
    </MatrixWrapper>
  );
}

WordsMatrix.MnemonicsInputs = MnemonicsInputs;

export default WordsMatrix;
