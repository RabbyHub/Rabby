import React from 'react';

import { useApprovalsPage } from '../hooks/useManageApprovalsPage';
import { useEIP7702Approvals } from '../hooks/useEIP7702Approvals';
import { EIP7702Panel } from './EIP7702Panel';

export const EIP7702RevokeList: React.FC = () => {
  const { searchKw, openAddressOnScan } = useApprovalsPage();
  const {
    isLoading,
    data,
    selectedRows,
    setSelectedRows,
  } = useEIP7702Approvals();

  return (
    <EIP7702Panel
      isLoading={isLoading}
      rows={data}
      selectedRows={selectedRows}
      setSelectedRows={setSelectedRows}
      searchKw={searchKw}
      onOpenAddress={openAddressOnScan}
    />
  );
};
