import { RcIconSuccessCC, RcIconWaringCC } from '@/ui/assets/desktop/common';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { NFTDetail } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Modal, ModalProps } from 'antd';
import React from 'react';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

export const ResultModal: React.FC<
  ModalProps & {
    nftDetail?: NFTDetail;
    onOk?(): void;
    desc?: React.ReactNode;
    status?: 'success' | 'failed';
  }
> = (props) => {
  const { nftDetail, title, desc, status, ...rest } = props;

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
            ) : null}
            <div className="text-[20px] leading-[24px] font-medium">
              {title}
            </div>
          </div>
          <div className="text-[13] leading-[16px] text-r-neutral-body font-medium text-center">
            {desc}
          </div>
        </div>
        <footer>
          <Button
            type="primary"
            className="w-[280px] h-[44px] rounded-[6px] text-[15px] leading-[18px] font-medium"
            onClick={props.onCancel}
          >
            OK
          </Button>
        </footer>
      </div>
    </Modal>
  );
};
