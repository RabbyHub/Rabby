import React from 'react';
import styled from 'styled-components';

const Bookmark = styled.div`
  position: relative;
  left: 0px;
  background: var(--rb-neutral-secondary);
  border-radius: 0 6px 6px 0;

  font-size: 12px;
  font-weight: 500;
  color: var(--rb-neutral-InvertHighlight);
  line-height: 14px;
  padding: 4px 16px;
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
