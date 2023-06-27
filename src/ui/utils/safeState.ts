// inspired from https://github.com/nickfla1/react-use-safe-state/blob/main/src/index.ts
import {
  useState,
  useEffect,
  useRef,
  Dispatch,
  SetStateAction,
  useCallback,
} from 'react';

type SetStateFn<T> = Dispatch<SetStateAction<T | undefined>>;
type SafeSetState<T> = [T | undefined, SetStateFn<T>];

export const useSafeState = <T = undefined>(
  initialState?: T | (() => T | undefined)
): SafeSetState<T> => {
  const [state, setState] = useState(initialState);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const setSafeState = useCallback<SetStateFn<T>>(
    (newState) => {
      if (mounted.current) {
        setState(newState);
      }
    },
    [setState]
  );

  return [state, setSafeState];
};
