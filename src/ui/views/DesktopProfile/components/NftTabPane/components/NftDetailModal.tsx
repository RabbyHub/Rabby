import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { findChain } from '@/utils/chain';
import {
  CollectionList,
  NFTCollection,
  NFTItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { Button, Modal, ModalProps } from 'antd';
import React from 'react';

export const NftDetailModal: React.FC<
  ModalProps & {
    nft?: NFTItem;
    collection?: Omit<CollectionList, 'nft_list'>;
  }
> = (props) => {
  const { nft, collection, ...rest } = props;

  const chain = findChain({ serverId: nft?.chain });

  return (
    <Modal
      {...rest}
      width={796}
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
      destroyOnClose
    >
      <h1 className="text-r-neutral-title1 text-[20px] leading-[24px] font-medium text-center py-[16px] m-0">
        {nft?.name || '-'}
      </h1>
      <div className="px-[20px] pb-[20px]">
        <div className="flex items-start gap-[16px]">
          <NFTAvatar
            className="w-[340px] h-[340px] flex-shrink-0"
            type={nft?.content_type}
            amount={nft?.amount}
            content={nft?.content}
          />
          <div className="flex-1 min-w-0">
            <div className="border-[0.5px] border-solid border-rabby-neutral-line rounded-[8px]">
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  Collection
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {collection?.name || '-'}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  Chain
                </div>
                <div className="flex items-center gap-[6px]">
                  <img src={chain?.logo} className="w-[16px] h-[16px]" alt="" />
                  <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                    {chain?.name || '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  Collection floor
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  {collection?.floor_price}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  Rarity
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  #{nft?.inner_id || '-'}
                </div>
              </div>
              <div className="flex items-center justify-between gap-[16px] p-[16px]">
                <div className="text-r-neutral-title1 text-[13px] leading-[16px]">
                  Last sale
                </div>
                <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium truncate">
                  0.01 ETH
                </div>
              </div>
            </div>

            <div className="mt-[16px]">
              <div className="text-r-neutral-title1 text-[13px] leading-[16px] font-medium mb-[8px]">
                Top Offer
              </div>
              <div className="border-[0.5px] border-solid border-rabby-neutral-line px-[12px] py-[14px rounded-[8px]">
                <div className="flex items-center justify-between gap-[8px]">
                  <div>
                    <div>0.52 ETH ($2,323.76)</div>
                    <div>Ending: 1 day Platform: OpenSea</div>
                  </div>
                  <div>
                    <Button type="primary">Accept</Button>
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-[24px] flex items-center gap-[12px]">
              <Button block size="large" type="primary">
                List on OpenSea
              </Button>
              <Button block size="large" type="primary" ghost>
                Send
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </Modal>
  );
};
