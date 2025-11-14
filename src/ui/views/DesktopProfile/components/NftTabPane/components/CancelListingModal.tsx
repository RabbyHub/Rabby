import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { Button, Modal, ModalProps } from 'antd';
import clsx from 'clsx';
import React from 'react';

export const CancelListingModal: React.FC<ModalProps> = (props) => {
  return (
    <Modal
      {...props}
      width={440}
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
      className="modal-support-darkmode"
    >
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        Cancel Listing
      </h1>
      <div className="px-[20px] pb-[24px] pt-[12px]">
        <div className="flex items-center justify-between">
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            1 Listing
          </div>
          <div className="text-r-neutral-foot text-[13px] leading-[16px] font-medium">
            Listing Price
          </div>
        </div>
        <div className="flex items-center gap-[10px] pt-[12px] pb-[24px]">
          <NFTAvatar className="w-[36px] h-[36px]" chain="eth" />
          <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
            <div
              className={clsx(
                'flex items-center justify-between',
                'text-[13px] leading-[16px] font-medium text-r-neutral-title1'
              )}
            >
              <div>Rabby Desktop Genesis 37345</div>
              <div>1.00 ETH</div>
            </div>
            <div
              className={clsx(
                'flex items-center justify-between',
                'text-[13px] leading-[16px] font-medium text-r-neutral-foot'
              )}
            >
              <div>Rabby Desktop Genesis</div>
              <div>$4,430.00</div>
            </div>
          </div>
        </div>
        <footer>
          <Button type="primary" block size="large">
            Cancel listing
          </Button>
        </footer>
      </div>
    </Modal>
  );
};
