import React from 'react';
import { useSignatureStore } from '@/ui/component/MiniSignV2/state';
import MiniSignTxV2 from '@/ui/views/Approval/components/MiniSignTx/MiniSignTxV2';
import { supportedHardwareDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { Modal } from '@/ui/component';

export const GlobalSignerPortal: React.FC = () => {
  const state = useSignatureStore();
  const { config, ctx } = state;
  console.log('useSignatureStore state', state);

  // if (!config?.account || state.status === 'idle') return null;

  return (
    <>
      {!config?.account || state.status === 'idle' ? null : <MiniSignTxV2 />}
      {ctx?.mode === 'direct' &&
      config?.account &&
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
            // backgroundColor: showTransparentMask
            //   ? 'transparent'
            //   : 'rgba(0,0,0,0.1)',
            backgroundColor: 'transparent',
          }}
        >
          {
            // <div className="w-[52px] h-[52px] p-[14px] flex items-center justify-center">
            //   <RCIconLoadingCC className="text-r-neutral-body animate-spin" />
            // </div>
          }
        </Modal>
      ) : null}
    </>
  );
};
