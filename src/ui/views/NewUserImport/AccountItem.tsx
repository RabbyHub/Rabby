import { Input } from 'antd';
import styled from 'styled-components';

export const AccountItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-radius: 8px;
  padding: 0;
`;

export const AccountItemInputWrapper = styled.div`
  display: flex;
  align-items: center;
  font-weight: 500;
`;

export const AccountItemInput = styled(Input)`
  &.ant-input {
    width: 100%;
    height: 56px;
    border: none;
    border-radius: 6px;
    background: var(--r-neutral-card2);
    padding: 18px 12px;
    color: var(--r-neutral-title-1);
    font-size: 18px;
    line-height: normal;
    font-weight: 500;
  }
`;

export const AccountItemAddress = styled.div`
  margin-top: 8px;
  color: var(--r-neutral-foot);
  font-size: 13px;
  line-height: normal;
`;
