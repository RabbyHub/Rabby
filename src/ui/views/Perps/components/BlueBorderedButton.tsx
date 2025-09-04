import { Button } from 'antd';
import styled from 'styled-components';

export const PerpsBlueBorderedButton = styled(Button)`
  height: 44px;
  font-size: 15px;
  font-style: normal;
  font-weight: 500;
  background-color: transparent;
  color: var(--r-blue-default, #7084ff);
  border: 1px solid var(--r-blue-default, #7084ff);

  &:focus {
    background-color: transparent;
    color: var(--r-blue-default, #7084ff);
    border: 1px solid var(--r-blue-default, #7084ff);
  }

  &:hover {
    background: var(--r-blue-light1, #eef1ff);
    color: var(--r-blue-default, #7084ff);
    border: 1px solid var(--r-blue-default, #7084ff);
  }

  &:hover:before {
    background-color: transparent;
  }

  &::before {
    transition: none;
    background-color: transparent;
  }
  &.ant-btn[disabled],
  &.ant-btn[disabled]:hover,
  &.ant-btn[disabled]:focus,
  &.ant-btn[disabled]:active {
    background-color: transparent;
    color: var(--r-blue-default, #7084ff);
    border: 1px solid var(--r-blue-default, #7084ff);
  }
`;
