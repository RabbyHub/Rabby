import React, { useCallback, useRef, useState } from 'react';

export function useRefState<T>(initValue: T | null) {
  const stateRef = useRef<T>(initValue) as React.MutableRefObject<T>;
  const [, setSpinner] = useState(false);

  const setRefState = useCallback((newState: T, triggerRerender = true) => {
    stateRef.current = newState;
    if (triggerRerender) {
      setSpinner((prev) => !prev);
    }
  }, []);

  return {
    state: stateRef.current,
    stateRef,
    setRefState,
  } as const;
}
