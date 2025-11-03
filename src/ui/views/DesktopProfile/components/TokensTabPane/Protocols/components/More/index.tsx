import React, { ReactNode } from 'react';
import styled from 'styled-components';

// Styled components
const Container = styled.span`
  width: 100%;
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
  display: flex;
`;

const KVKey = styled.span`
  font-size: 13px;
  color: var(--r-neutral-title1);
  line-height: 16px;
  margin-right: 8px;
`;

const KVValue = styled.span<{ vClassName?: string }>`
  font-size: 13px;
  font-weight: 500;
  color: var(--r-neutral-title1);
  line-height: 16px;
`;

export const More: React.FC<{ children?: ReactNode; className?: string }> = (
  props
) => {
  return (
    <Container className={props.className}>
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
