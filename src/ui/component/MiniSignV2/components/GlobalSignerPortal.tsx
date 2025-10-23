import React from 'react';
import { useSignatureStore } from '@/ui/component/MiniSignV2/state';
import MiniSignTxV2 from '@/ui/views/Approval/components/MiniSignTx/MiniSignTxV2';
import { supportedHardwareDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { Modal } from '@/ui/component';

export const GlobalSignerPortal: React.FC = () => {
  const state = useSignatureStore();
  const { config, ctx, status } = state;

  if (!config?.account || state.status === 'idle') return null;

  return (
    <>
      <MiniSignTxV2 />
      {ctx?.mode === 'direct' &&
      status !== 'ready' &&
      !supportedHardwareDirectSign(config?.account.type || '') ? (
        <Modal
          transitionName=""
          visible={true}
          maskClosable={false}
          centered
          cancelText={null}
          okText={null}
          footer={null}
          width={'auto'}
          closable={false}
          bodyStyle={{ padding: 0 }}
          maskStyle={{
            backgroundColor: 'transparent',
          }}
        ></Modal>
      ) : null}
    </>
  );
};
