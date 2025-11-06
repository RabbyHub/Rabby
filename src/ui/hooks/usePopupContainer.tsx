import { useMemoizedFn } from 'ahooks';
import React, { createContext, useContext, useRef } from 'react';
import styled from 'styled-components';

const PopupContext = createContext<(() => HTMLElement) | undefined>(undefined);

const Container = styled.div`
  width: 100% !important;
  overflow: hidden;
  transform: translateX(0);
`;

export const PopupContainer: React.FC<{
  style?: StyleSheet;
  className?: string;
}> = ({ children, style, className }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const getContainer = useMemoizedFn(() => {
    return ref.current || document.body;
  });
  return (
    <PopupContext.Provider value={getContainer}>
      <Container ref={ref} style={style} className={className}>
        {children}
      </Container>
    </PopupContext.Provider>
  );
};

export const usePopupContainer = () => {
  const getContainer = useContext(PopupContext);

  return {
    getContainer,
  };
};
