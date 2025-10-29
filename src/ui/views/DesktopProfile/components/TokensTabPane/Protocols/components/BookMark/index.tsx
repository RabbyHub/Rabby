import React from 'react';
import styled from 'styled-components';

const Bookmark = styled.div`
  position: relative;
  left: 0px;
  background: var(--r-neutral-card2);
  border-radius: 0 4px 4px 0;

  font-size: 12px;
  font-weight: 500;
  color: var(--r-neutral-title1);
  line-height: 14px;
  padding: 5px 16px;
`;

type BookMarkProps = {
  content: string;
  className?: string;
};

export const BookMark = ({ content, className, ...rest }: BookMarkProps) => {
  return (
    <Bookmark {...rest} className={className}>
      {content}
    </Bookmark>
  );
};

export default BookMark;
