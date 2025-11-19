import React from 'react';
import { MiniTypedDataApprovalV2 } from '@/ui/views/Approval/components/MiniSignTypedData/MiniTypedDataApprovalV2';
import { useTypedDataSignatureStore } from '../state';

export const GlobalTypedDataSignerPortal: React.FC<{
  isDesktop?: boolean;
}> = React.memo(({ isDesktop }) => {
  const { request, status } = useTypedDataSignatureStore();
  if (!request || status === 'idle') return null;
  return <MiniTypedDataApprovalV2 isDesktop={isDesktop} />;
});
