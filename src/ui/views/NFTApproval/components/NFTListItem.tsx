import { NFTApproval } from '@/background/service/openapi';
import { ellipsis } from '@/ui/utils/address';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';
import { Button } from 'antd';
import React from 'react';

interface NFTListItemProps {
  item: NFTApproval;
  onDecline(item: any): void;
}

const NFTListItem = ({ item, onDecline }: NFTListItemProps) => {
  return (
    <div className="list-item">
      <NFTAvatar
        className="list-item-avatar"
        thumbnail
        type={item.content_type}
        content={item.content}
        chain={item.chain}
      ></NFTAvatar>
      <div className="list-item-body">
        <div className="list-item-title">{item.name || 'Unknown NFT'}</div>
        <div className="list-item-desc">{item.amount} NFT</div>
      </div>
      <div className="list-item-extra">
        <div className="list-item-title text-right">
          {item.spender?.protocol?.name}
          {!item.spender?.protocol && (
            <span className={'nft-approval-tag'}>Unknown Contract</span>
          )}
        </div>
        <div className="list-item-desc">{ellipsis(item.spender.id)}</div>
        <Button
          type="primary"
          danger
          ghost
          shape="round"
          size="small"
          onClick={() => {
            onDecline(item);
          }}
        >
          Decline
        </Button>
      </div>
    </div>
  );
};

export default NFTListItem;
