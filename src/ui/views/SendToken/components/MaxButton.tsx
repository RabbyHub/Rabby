import styled from 'styled-components';

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
