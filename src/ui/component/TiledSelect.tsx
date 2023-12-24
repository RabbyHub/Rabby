import React from 'react';
import cx from 'clsx';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import IconClear from 'ui/assets/clear.svg';
import WordsMatrix from './WordsMatrix';

function makeSlots<T>(options: T[]): T[] {
  return new Array(options.length).fill(null);
}

function useSelectOptionsFill<T extends Exclude<any, null>>({
  options,
  onChange,
  value,
}: {
  options: T[];
  onChange: TiledSelectProps<T>['onChange'];
  value?: T[];
}) {
  const [slotValues, _setSlotValues] = React.useState<(T | null)[]>(
    makeSlots(options)
  );

  const setSlotValues = React.useCallback(
    (vals: (T | null)[]) => {
      _setSlotValues(vals);
      onChange?.(vals);
    },
    [onChange]
  );

  const selectedOptIdxesRef = React.useRef(new Set<number>());
  const selectedOptIdxes = selectedOptIdxesRef.current;

  React.useEffect(() => {
    if (typeof value === 'undefined') {
      setSlotValues(makeSlots(options));
      selectedOptIdxesRef.current = new Set();
    } else {
      setSlotValues([...value]);
      selectedOptIdxesRef.current = new Set(value.map((_, idx) => idx));
    }
  }, [value, options]);

  const clearSlots = React.useCallback(() => {
    setSlotValues(makeSlots(options));
    selectedOptIdxesRef.current = new Set();
    setCurrentFocusingIndex(0);
  }, [options]);

  const setValueFromOpt = React.useCallback(
    (optIdx: number, slotIdx: number) => {
      if (slotIdx > slotValues.length - 1) return;

      selectedOptIdxes.add(optIdx);
      const couldJump =
        slotIdx < slotValues.length && slotValues[slotIdx + 1] === null;

      slotValues[slotIdx] = options[optIdx];
      setSlotValues([...slotValues]);
      couldJump && setCurrentFocusingIndex(slotIdx + 1);
    },
    [slotValues]
  );

  const clearValueByIdx = React.useCallback(
    (slotIdx: number) => {
      if (slotIdx > slotValues.length - 1) return;

      const optIdx = options.findIndex((opt) => opt === slotValues[slotIdx]);
      selectedOptIdxes.delete(optIdx);
      slotValues[slotIdx] = null;
      setSlotValues([...slotValues]);
      setCurrentFocusingIndex(slotIdx);
    },
    [slotValues]
  );

  const firstNullSlotIdx = React.useMemo(() => {
    return Math.max(
      slotValues.findIndex((item) => item === null),
      0
    );
  }, [slotValues]);

  const isOptionSelected = React.useCallback(
    (optIdx: number) => {
      return selectedOptIdxesRef.current?.has(optIdx);
    },
    [options, slotValues]
  );
  const [currentFocusingIndex, setCurrentFocusingIndex] = React.useState(-1);
  const targetIdx =
    currentFocusingIndex >= 0 ? currentFocusingIndex : firstNullSlotIdx;

  return {
    slotValues,
    clearSlots,
    setValueFromOpt,
    clearValueByIdx,
    isOptionSelected,
    targetIdx,
    setCurrentFocusingIndex,
  };
}

interface TiledSelectProps<T extends Exclude<any, null> = string> {
  correctValue?: T[];
  defaultValue?: T[];
  value?: T[];
  options: T[];
  onChange?(arg: (T | null)[]): void;
  onClear?(): void;
  className?: string;
  errMsg?: string;
}

const TiledSelect = ({
  options,
  onChange,
  className,
  errMsg = '',
  correctValue,
  onClear,
}: TiledSelectProps) => {
  const {
    slotValues,
    clearSlots,
    isOptionSelected,
    setValueFromOpt,
    clearValueByIdx,
    targetIdx,
    setCurrentFocusingIndex,
  } = useSelectOptionsFill<string>({
    // value: correctValue, // just for debug
    options,
    onChange,
  });

  const { t } = useTranslation();

  return (
    <div className={className}>
      <WordsMatrix
        className="mb-20"
        focusable
        focusingIndex={targetIdx}
        onFocusWord={({ index }) => {
          setCurrentFocusingIndex(index);
        }}
        closable
        onCloseWord={({ index }) => {
          clearValueByIdx(index);
        }}
        words={slotValues.map((x) => x || '')}
      />
      {errMsg && (
        <div className="rounded-lg text-center font-medium mb-20 pr-0 h-[20px] relative">
          <div className="flex text-12 justify-between absolute left-0 bottom-12 px-12 w-full">
            <span className="text-red-light">{errMsg}</span>
            <span
              className="text-r-neutral-body flex cursor-pointer"
              onClick={() => {
                clearSlots();
                onClear?.();
              }}
            >
              <img src={IconClear} className="w-[12px] h-[12px] mr-4" />
              {t('global.Clear')}
            </span>
          </div>
        </div>
      )}
      <div className="flex justify-between flex-wrap clear-left">
        {options.map((o, i) => (
          <div
            style={{ lineHeight: '32px' }}
            className={cx(
              (i + 1) % 4 === 0 ? 'mr-0' : 'mr-8',
              'h-[32px] w-[84px] rounded-lg text-center mb-8 font-medium transition-colors border',
              isOptionSelected(i)
                ? 'bg-gray-bg text-gray-comment border-gray-divider'
                : 'bg-white text-r-neutral-title1 border-white cursor-pointer'
            )}
            key={i}
            onClick={() => {
              if (correctValue) {
                if (options[i] !== correctValue[targetIdx]) {
                  message.error(t('component.TiledSelect.errMsg'));
                  return;
                }

                setValueFromOpt(i, targetIdx);
              }
            }}
          >
            {o}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TiledSelect;
