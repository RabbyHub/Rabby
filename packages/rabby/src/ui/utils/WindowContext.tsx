import React, { ReactNode, useEffect, useState } from 'react';
import { createContext, useContext } from 'react';
import { getCurrentWindow } from './webapi';

const WindowContext = createContext<{ id: number } | null>(null);

const WindowProvider = ({ children }: { children?: ReactNode }) => {
  const [id, setId] = useState(-1);

  const getWindowProperty = async () => {
    const _id = await getCurrentWindow();
    setId(_id!);
  };

  useEffect(() => {
    getWindowProperty();
  }, []);

  return (
    <WindowContext.Provider value={{ id }}>{children}</WindowContext.Provider>
  );
};

const useWindowContext = () => {
  const { id } = useContext(WindowContext) || {};

  return id;
};

export { WindowProvider, useWindowContext };
