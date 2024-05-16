import React from 'react';
import styled from 'styled-components';

const Div = styled.div`
  height: 1px;
  height: 0.5px;
  background-color: var(--r-neutral-card2, #f2f4f7);
  width: 100%;
`;

export const Divide: React.FC<any> = (props) => {
  return <Div {...props} />;
};
