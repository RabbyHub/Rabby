import React from 'react';
import styled from 'styled-components';

const Div = styled.div`
  border-radius: 8px;
  background: var(--r-neutral-card1, #fff);
`;

export const Card: React.FC = ({ children }) => {
  return <Div>{children}</Div>;
};
