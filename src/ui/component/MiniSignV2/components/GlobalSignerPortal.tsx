import React from 'react';
import { useSignatureStore } from '@/ui/component/MiniSignV2/state';
import MiniSignTxV2 from '@/ui/views/Approval/components/MiniSignTx/MiniSignTxV2';
import { supportedHardwareDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import styled from 'styled-components';
import { Modal } from '@/ui/component';

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border: none !important;
  }
`;

export const GlobalSignerPortal: React.FC<{
  isDesktop?: boolean;
}> = React.memo(({ isDesktop }) => {
  const state = useSignatureStore();
  const { config, ctx, status } = state;

  if (!config?.account || state.status === 'idle') return null;

  return (
    <>
      <MiniSignTxV2 isDesktop={isDesktop} />
      {ctx?.mode === 'direct' &&
      status !== 'ready' &&
      !supportedHardwareDirectSign(config?.account.type || '') ? (
        <StyledModal
          getContainer={isDesktop ? config.getContainer : undefined}
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
          style={{
            border: 'none',
          }}
        ></StyledModal>
      ) : null}
    </>
  );
});
