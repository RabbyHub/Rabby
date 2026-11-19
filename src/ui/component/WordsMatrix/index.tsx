import React from 'react';
import clsx from 'clsx';
import { cn } from '@/ui/utils/cn';

import IconCloseSvg from 'ui/assets/close-icon.svg';

import MnemonicsInputs from './MnemonicsInputs';
import styles from './index.module.css';

const ROW_COUNT = 3;

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
  const matrixRowCount = rowCount || ROW_COUNT;
  const [checkedWords, setCheckedWords] = React.useState<string[]>(
    words.slice()
  );

  React.useEffect(() => {
    setCheckedWords(words.slice());
  }, [words]);

  return (
    <div
      className={cn(styles.matrix, 'rounded-[6px] text-center', className)}
      style={
        {
          '--matrix-item-width': `${(1 / matrixRowCount) * 100}%`,
        } as React.CSSProperties
      }
    >
      {checkedWords.map((word, idx) => {
        const number = idx + 1;
        const clearable = closable && !!word.trim();
        const errored = errorIndexes.includes(idx);

        return (
          <div
            key={`word-item-${word}-${idx}`}
            className={cn(
              'matrix-word-item',
              (idx + 1) % matrixRowCount === 0 && styles.rowEnd,
              idx >= checkedWords.length - matrixRowCount && styles.lastRow
            )}
            onClick={() => {
              if (focusable) {
                onFocusWord?.({ word: word, index: idx });
              }
            }}
          >
            {!errored && focusingIndex === idx && (
              <div className={styles.focusingBox} />
            )}
            {errored && (
              <div className={clsx(styles.focusingBox, styles.errorBox)} />
            )}
            <div className={styles.numberFlag}>{number}.</div>
            <span className="text">{word}</span>

            {clearable && (
              <div
                className="close-icon-wrapper"
                onClick={(evt) => {
                  onCloseWord?.({ word: word, index: idx });
                  evt.stopPropagation();
                }}
              >
                <img
                  src={IconCloseSvg}
                  className="w-[8px] h-[8px] cursor-pointer"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

WordsMatrix.MnemonicsInputs = MnemonicsInputs;

export default WordsMatrix;
