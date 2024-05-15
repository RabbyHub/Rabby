import React from 'react';
import styled from 'styled-components';

const Div = styled.div`
  border-radius: 8px;
  background: var(--r-neutral-card1, #fff);
  border: 1px solid transparent;
`;

export const Card: React.FC<any> = (props) => {
  return <Div {...props} />;
};
