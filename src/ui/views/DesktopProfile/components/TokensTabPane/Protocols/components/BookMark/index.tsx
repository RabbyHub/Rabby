import React from 'react';
import styled from 'styled-components';

const Bookmark = styled.div`
  position: relative;
  left: 0px;
  background: var(--color-light-blue-title);
  border-radius: 0 4px 4px 0;

  font-size: 12px;
  font-weight: bold;
  color: var(--bg-white-color);
  line-height: 14px;
  padding: 4px 26px;
`;

const Container = styled.div`
  position: static;
  padding: 10px 0;
`;

type BookMarkProps = {
  content: string;
  className?: string;
};

export const BookMark = ({ content, className, ...rest }: BookMarkProps) => {
  return (
    <Bookmark {...rest} className={className}>
      <Container>{content}</Container>
    </Bookmark>
  );
};

export default BookMark;
