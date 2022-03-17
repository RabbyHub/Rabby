import { NFTApprovalContract } from '@/background/service/openapi';
import { ellipsis } from '@/ui/utils/address';
import { Button } from 'antd';
import React from 'react';
import { getAmountText } from '../utils';

interface NFTContractListItemProps {
  item: NFTApprovalContract;
  onDecline(item: any): void;
}

const NFTContractListItem = ({ item, onDecline }: NFTContractListItemProps) => {
  return (
    <div className="list-item">
      <div className="list-item-body">
        <div className="list-item-title">
          {item.contract_name || '-'} ({getAmountText(item?.amount || 0)})
        </div>
        <div className="list-item-desc">{ellipsis(item.contract_id)}</div>
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

export default NFTContractListItem;
