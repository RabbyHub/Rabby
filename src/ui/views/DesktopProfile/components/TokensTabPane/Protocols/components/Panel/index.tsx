import React, { ReactNode } from 'react';

import BookMark from '../BookMark';
import styled from 'styled-components';

const Container = styled.div`
  padding-top: 8px;
`;

const PanelHead = styled.div`
  display: flex;
  align-items: center;
`;

const Card = styled.div`
  padding: 0;
`;

export const Panel: React.FC<{
  tag?: string;
  proposalTag?: ReactNode;
  subTag?: ReactNode;
  className?: string;
  key?: string;
  children?: ReactNode;
}> = (props) => {
  const { tag, subTag, proposalTag, className, ...rest } = props;
  return (
    <Container className={className} {...rest}>
      <PanelHead>
        {tag && <BookMark content={tag} />}
        {proposalTag}
        {subTag}
      </PanelHead>
      <Card>{props.children}</Card>
    </Container>
  );
};
