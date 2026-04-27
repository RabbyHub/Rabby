import React from 'react';
import {
  SignatureInstanceProvider,
  useRegistryInstances,
} from '@/ui/component/MiniSignV2/state';
import MiniSignTxV2 from '@/ui/views/Approval/components/MiniSignTx/MiniSignTxV2';

export const GlobalSignerPortal: React.FC<{
  isDesktop?: boolean;
}> = React.memo(({ isDesktop }) => {
  const instances = useRegistryInstances();

  return (
    <>
      {instances.map((instance) => (
        <SignatureInstanceProvider
          key={instance.instanceId}
          instance={instance}
        >
          <MiniSignTxV2 isDesktop={isDesktop} />
        </SignatureInstanceProvider>
      ))}
    </>
  );
});
