import React from 'react';
import { Input, InputProps } from 'antd';
import clsx from 'clsx';
import styled from 'styled-components';

const Container = styled.div`
  height: 30px;
  background-color: var(--r-neutral-card1);
  border-radius: 20px;
  overflow: hidden;
  border: 0.5px solid var(--rb-neutral-line);
  transition: ease-in 0.2s border-color;

  width: 320px;

  .ant-input-affix-wrapper.search-input,
  .ant-input {
    background-color: transparent;
    color: var(--r-neutral-title1);
    &::placeholder {
      color: var(--r-neutral-foot);
    }
  }

  &.is-focusing,
  &:hover {
    border-color: var(--r-blue-default, #7084ff);
    border-width: 0.5px;
  }
`;

// const SearchInput = React.forwardRef<InputProps>();
const SearchInput = function (props: InputProps) {
  const [isFocusing, setIsFocusing] = React.useState(false);

  const handleFocus = React.useCallback(
    (e) => {
      setIsFocusing(true);
      props.onFocus?.(e);
    },
    [props.onFocus]
  );

  const handleBlur = React.useCallback(
    (e) => {
      setIsFocusing(false);
      props.onBlur?.(e);
    },
    [props.onBlur]
  );

  return (
    <Container className={clsx(isFocusing && 'is-focusing')}>
      <Input
        {...props}
        // ref={ref as any}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </Container>
  );
};

export default SearchInput;
