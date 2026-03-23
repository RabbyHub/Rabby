import React from 'react';
import { Input, InputProps } from 'antd';
import styled from 'styled-components';

const StyledInput = styled(Input)`
  input::-webkit-inner-spin-button,
  input::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* With prefix/suffix (affix wrapper) */
  &.ant-input-affix-wrapper {
    border-radius: 8px;
    border: 1px solid var(--rb-neutral-line, #e0e5ec);
    background: var(--rb-neutral-bg-5, #fff);
    height: 44px;
    transition: border-color 0.2s;

    &:hover,
    &.ant-input-affix-wrapper-focused,
    &.slider-active {
      border-color: var(--rb-brand-default, #7084ff);
    }

    .ant-input {
      background: transparent;
      border: none;
      border-radius: 0;
      box-shadow: none;
      font-size: 15px;
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

  /* Without prefix/suffix (plain input) */
  &.ant-input {
    border-radius: 8px;
    border: 1px solid var(--rb-neutral-line, #e0e5ec);
    background: var(--rb-neutral-bg-5, #fff);
    height: 44px;
    font-size: 15px;
    color: var(--rb-neutral-title-1, #111827);
    font-weight: 500;
    padding: 0 11px;
    transition: border-color 0.2s;

    &:hover,
    &:focus,
    &.slider-active {
      border-color: var(--rb-brand-default, #7084ff);
      box-shadow: none;
    }

    &::placeholder {
      color: var(--rb-neutral-foot, #6b7280);
      opacity: 1;
    }
  }
`;

interface DesktopPerpsInputV2Props extends InputProps {}

export const DesktopPerpsInputV2: React.FC<DesktopPerpsInputV2Props> = (
  props
) => {
  return <StyledInput placeholder="0" {...props} />;
};
