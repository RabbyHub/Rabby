import { RcIconSuccessCC, RcIconWaringCC } from '@/ui/assets/desktop/common';
import { RcIconSpinCC } from '@/ui/assets/desktop/profile';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTDetail } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { Button, Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React, { useState } from 'react';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

type Props = ModalProps & {
  nftDetail?: NFTDetail;
  status?: 'success' | 'failed' | 'pending';
  pendingPromise?: Promise<any>;
  successMessage?: {
    title?: string;
    desc?: string;
  };
  errorMessage?: {
    title?: string;
    desc?: string;
  };
};
const Content: React.FC<Props> = (props) => {
  const {
    nftDetail,
    title,
    successMessage,
    errorMessage,
    status: _status,
    pendingPromise,
  } = props;

  const [status, setStatus] = useState(_status);

  useRequest(
    async () => {
      await pendingPromise;
    },
    {
      onSuccess() {
        setStatus('success');
      },
      onError() {
        setStatus('failed');
      },
      refreshDeps: [pendingPromise],
      ready: !!pendingPromise,
    }
  );

  return (
    <div className="flex flex-col items-center py-[40px] px-[20px]">
      <NFTAvatar
        className="w-[160px] h-[160px]"
        // chain={nftDetail?.chain}
        content={nftDetail?.content}
        type={nftDetail?.content_type}
      />
      <div className="mt-[20px] mb-[40px]">
        <div className="mb-[8px] flex items-center justify-center gap-[6px]">
          {status === 'success' ? (
            <RcIconSuccessCC className="text-r-green-default" />
          ) : status === 'failed' ? (
            <RcIconWaringCC className="text-r-red-default" />
          ) : status === 'pending' ? (
            <RcIconSpinCC className="animate-spin text-r-orange-default" />
          ) : null}
          {status === 'pending' ? (
            <div className="text-[20px] leading-[24px] font-medium text-r-orange-default">
              Pending
            </div>
          ) : status === 'success' ? (
            <div className="text-[20px] leading-[24px] font-medium">
              {successMessage?.title}
            </div>
          ) : status === 'failed' ? (
            <div className="text-[20px] leading-[24px] font-medium">
              {errorMessage?.title}
            </div>
          ) : null}
        </div>
        {status === 'pending' ? (
          <div className="text-[13] leading-[16px] text-r-neutral-body font-medium text-center">
            Confirming your transaction
          </div>
        ) : status === 'success' ? (
          <div className="text-[13] leading-[16px] text-r-neutral-body font-medium text-center">
            {successMessage?.desc}
          </div>
        ) : status === 'failed' ? (
          <div className="text-[13] leading-[16px] text-r-neutral-body font-medium text-center">
            {errorMessage?.desc}
          </div>
        ) : null}
      </div>
      <footer>
        {status === 'pending' ? (
          <div
            className={clsx(
              'flex items-center justify-center',
              'w-[280px] h-[44px] rounded-[6px] bg-r-neutral-card2 cursor-pointer',
              'text-[15px] leading-[18px] font-medium text-r-neutral-foot'
            )}
            onClick={props.onCancel}
          >
            Close
          </div>
        ) : (
          <Button
            type="primary"
            className="w-[280px] h-[44px] rounded-[6px] text-[15px] leading-[18px] font-medium"
            onClick={props.onCancel}
          >
            OK
          </Button>
        )}
      </footer>
    </div>
  );
};

export const ResultModal: React.FC<Props> = (props) => {
  const { nftDetail, status, ...rest } = props;

  return (
    <Modal
      {...rest}
      width={400}
      centered
      footer={null}
      bodyStyle={{
        maxHeight: 'unset',
        padding: 0,
      }}
      maskStyle={{
        background: 'rgba(0, 0, 0, 0.30)',
        backdropFilter: 'blur(8px)',
      }}
      closable={false}
      className="modal-support-darkmode"
      closeIcon={<RcIconCloseCC className="w-[20px] h-[20px]" />}
      destroyOnClose
    >
      <Content {...props} />
    </Modal>
  );
};
