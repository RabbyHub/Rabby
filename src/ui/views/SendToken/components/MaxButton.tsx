import styled from 'styled-components';

export const SendMaxButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  font-size: 12px;
  font-weight: 510;
  height: 18px;
  line-height: 14px;
  padding: 0;
  cursor: pointer;
  user-select: none;
  margin-left: 4px;
  background-color: var(--r-blue-light1);
  color: var(--r-blue-default);
  border-radius: 10px;
  &:hover {
    background-color: var(--r-blue-light2);
  }
`;

export const MaxButton = styled.div`
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  padding: 4px 5px;
  cursor: pointer;
  user-select: nonce;
  margin-left: 6px;
  background-color: var(--r-blue-light1);
  color: var(--r-blue-default);
  border-radius: 2px;
  &:hover {
    background-color: var(--r-blue-light2);
  }
`;
