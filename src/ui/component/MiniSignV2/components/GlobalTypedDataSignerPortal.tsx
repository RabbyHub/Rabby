import React from 'react';
import { MiniTypedDataApprovalV2 } from '@/ui/views/Approval/components/MiniSignTypedData/MiniTypedDataApprovalV2';

export const GlobalTypedDataSignerPortal: React.FC<{
  isDesktop?: boolean;
}> = React.memo(({ isDesktop }) => {
  return <MiniTypedDataApprovalV2 isDesktop={isDesktop} />;
});
