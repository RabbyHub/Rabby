import React, { ReactNode } from 'react';
import styled from 'styled-components';

// Styled components
const Container = styled.span`
  width: 100%;
  margin: 0 10px 10px 10px;
  display: flex;
  flex-direction: column;
`;

const Line = styled.div`
  width: 100%;
  justify-content: start;
  flex-wrap: wrap;
  display: flex;
  flex-direction: row;
`;

const KVContainer = styled.div`
  min-width: 220px;
  margin-bottom: 10px;
  display: flex;
`;

const KVKey = styled.span`
  font-size: 13px;
  color: var(--color-light-blue-title);
  line-height: 16px;
  margin-right: 12px;
`;

const KVValue = styled.span<{ vClassName?: string }>`
  font-size: 13px;
  font-weight: bold;
  color: var(--color-title);
  line-height: 16px;
`;

export const More: React.FC<{ children?: ReactNode }> = (props) => {
  return (
    <Container>
      <Line>{props.children}</Line>
    </Container>
  );
};

export const KV = (props: {
  k: ReactNode;
  v: ReactNode;
  vClassName?: string;
}) => {
  return (
    <KVContainer>
      <KVKey>{props.k}</KVKey>
      <KVValue className={props.vClassName}>{props.v}</KVValue>
    </KVContainer>
  );
};
