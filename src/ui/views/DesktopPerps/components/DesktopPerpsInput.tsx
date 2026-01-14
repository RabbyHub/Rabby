import React from 'react';
import { Input, InputProps } from 'antd';
import styled from 'styled-components';

// 使用 styled-components 修改 antd Input 的样式
const StyledInput = styled(Input)`
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &.ant-input-affix-wrapper {
    border-radius: 8px;
    border: 1px solid var(--rb-neutral-line, #e0e5ec);
    background: var(--rb-neutral-bg-1, #fff);
    padding: 11px;
    line-height: 1;

    .ant-input {
      background: transparent;
      border: none;
      border-radius: 0;
      box-shadow: none;
      font-size: 13px;
      line-height: 16px;
      color: var(--rb-neutral-title-1, #111827);
      font-weight: 500;

      &::placeholder {
        color: var(--rb-neutral-foot, #6b7280);
        opacity: 1;
      }
    }

    &.text-right .ant-input {
      text-align: right;
    }
  }
`;

interface DesktopPerpsInputProps extends InputProps {}

export const DesktopPerpsInput: React.FC<DesktopPerpsInputProps> = (props) => {
  return <StyledInput placeholder="0" {...props} />;
};
