import React from 'react';
import { noop } from 'lodash';
import { createContext, useContext, useState } from 'react';

export function createContextState<T>(initialState: T) {
  const StateContext = createContext<T>(initialState);
  const DispatchContext = createContext<
    React.Dispatch<React.SetStateAction<T>>
  >(noop);

  const useValue = () => useContext(StateContext);
  const useSetValue = () => useContext(DispatchContext);

  const Provider = ({ children }: React.PropsWithChildren<unknown>) => {
    const [value, setValue] = useState(initialState);

    return (
      <StateContext.Provider value={value}>
        <DispatchContext.Provider value={setValue}>
          {children}
        </DispatchContext.Provider>
      </StateContext.Provider>
    );
  };

  return [Provider, useValue, useSetValue] as const;
}
