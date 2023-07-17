import React from 'react';
import { Input, InputProps } from 'antd';
import clsx from 'clsx';

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
    <div className={clsx('search-input-wrapper', isFocusing && 'is-focusing')}>
      <Input
        {...props}
        // ref={ref as any}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
};

export default SearchInput;
