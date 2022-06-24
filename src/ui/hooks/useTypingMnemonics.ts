import React from 'react';
import { searchByPrefix } from '../utils/smart-completion';
import useDebounceValue from './useDebounceValue';

function isStrEnglish(w: string) {
  return /^([a-z]|[A-Z])+$/.test(w);
}

/**
 * @description extract last typing word from mnemonics, search
 * mnemonics in dictionary using typing word as search prefix
 * @returns
 */
export default function useTypingMnemonics({
  onSetCurrentHints,
  onAppendLastMnemonicsPart,
}: {
  onSetCurrentHints?: (words: string[]) => void;
  onAppendLastMnemonicsPart?: (word: string, words: string) => void;
} = {}) {
  const [mnemonics, setMnemonics] = React.useState<string | null>('');
  const [currentHints, _setCurrentHints] = React.useState<string[]>([]);

  const debouncedMnemonics = useDebounceValue(mnemonics, 250);
  const { lastTypingWord } = React.useMemo(() => {
    const mnemonicsList = debouncedMnemonics?.split(' ') || [];
    const lastTypingWord = mnemonicsList.pop() || '';

    return { lastTypingWord };
  }, [debouncedMnemonics]);

  const setCurrentHints = React.useCallback(
    (val: string[]) => {
      onSetCurrentHints?.(val);
      _setCurrentHints(val);
    },
    [lastTypingWord, onSetCurrentHints]
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
      onAppendLastMnemonicsPart?.(word, nextVal);

      if (inputTimerRef.current) clearTimeout(inputTimerRef.current);
      inputTimerRef.current = setTimeout(() => {
        inputRef.current?.focus();

        clearTimeout(inputTimerRef.current);
        inputTimerRef.current = null;
      }, 200);

      return nextVal;
    },
    [mnemonics]
  );

  React.useEffect(() => {
    if (!lastTypingWord || !isStrEnglish(lastTypingWord)) {
      setCurrentHints([]);
      return;
    }

    const words = searchByPrefix(lastTypingWord);
    setCurrentHints([...(words || [])]);
  }, [lastTypingWord]);

  return {
    currentHints,
    setMnemonics,
    setLastMnemonicsPart,
    isLastTypingWordFull: currentHints.includes(lastTypingWord),
    inputRef,
  };
}
