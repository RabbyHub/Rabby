import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  background: #f5f6fa;
  border-radius: 6px;
  padding: 10px 10px 20px 10px;
`;

const Card = ({ children }: { children: React.ReactNode }) => {
  return <Wrapper>{children}</Wrapper>;
};

export default Card;
