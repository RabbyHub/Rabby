import React from 'react';
import styled from 'styled-components';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';

const AccountItemWrapper = styled.div`
  background: #f5f6fa;
  border-radius: 6px;
  padding: 10px 16px;
`;

const AccountItem = ({
  account,
}: {
  account: IDisplayedAccountWithBalance;
}) => {
  return <AccountItemWrapper></AccountItemWrapper>;
};
