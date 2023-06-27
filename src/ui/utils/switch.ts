import { useCallback, useMemo } from 'react';
import { useSafeState } from './safeState';

export const useSwitch = (initialState?: boolean) => {
  const [on, setOn] = useSafeState(!!initialState);

  const turnOn = useCallback(() => {
    setOn(true);
  }, [setOn]);

  const turnOff = useCallback(() => {
    setOn(false);
  }, [setOn]);

  const toggle = useCallback(() => {
    setOn(!on);
  }, [on]);

  return useMemo(
    () => ({
      on: on as boolean,
      turn: setOn,
      turnOff,
      turnOn,
      toggle,
    }),
    [on, toggle, turnOff, turnOn]
  );
};
