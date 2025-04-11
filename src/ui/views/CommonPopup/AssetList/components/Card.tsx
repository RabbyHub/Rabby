import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  /* background: #f5f6fa; */
  background: var(--r-neutral-card-1, #f2f4f7);
  border-radius: 8px;
  padding: 20px 12px 12px 8px;
`;

const Card = ({ children }: { children: React.ReactNode }) => {
  return <Wrapper>{children}</Wrapper>;
};

export default Card;
