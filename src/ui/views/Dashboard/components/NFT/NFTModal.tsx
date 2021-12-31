import { NFTItem } from '@/background/service/openapi';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { Modal } from 'ui/component';
import { getChain } from 'utils';
import NFTAvatar from './NFTAvatar';
import BN from 'bignumber.js';
import { splitNumberByStep } from '@/ui/utils';
interface ContentProps {
  data?: NFTItem;
}

const calc = (data?: NFTItem) => {
  if (!data || !data?.pay_token?.amount || !data?.pay_token?.price) {
    return '-';
  }
  const price = new BN(data.pay_token.amount)
    .multipliedBy(data.pay_token.price)
    .toFixed(2);
  return `$${splitNumberByStep(price)}`;
};

const Content = ({ data }: ContentProps) => {
  const chain = getChain(data?.chain);
  const price = calc(data);
  return (
    <div className="nft-preview-card">
      <NFTAvatar
        thumbnail={false}
        content={data?.content}
        type={data?.content_type}
        amount={data?.amount}
      ></NFTAvatar>
      <div className="nft-preview-card-title">{data?.name || '-'}</div>
      <div className="nft-preview-card-list">
        <div className="nft-preview-card-list-item">
          <div className="nft-preview-card-list-item-label">Collection</div>
          <div className="nft-preview-card-list-item-value">
            {data?.collection?.name || '-'}
          </div>
        </div>
        <div className="nft-preview-card-list-item">
          <div className="nft-preview-card-list-item-label">Chain</div>
          <div className="nft-preview-card-list-item-value">{chain?.name}</div>
        </div>
        <div className="nft-preview-card-list-item">
          <div className="nft-preview-card-list-item-label">Purchase Date</div>
          <div className="nft-preview-card-list-item-value">
            {data?.pay_token?.date_at || '-'}
          </div>
        </div>
        <div className="nft-preview-card-list-item">
          <div className="nft-preview-card-list-item-label">Last Price</div>
          <div className="nft-preview-card-list-item-value">{price}</div>
        </div>
      </div>
      <Tooltip title="Coming soon">
        <Button block size="large" disabled>
          Send
        </Button>
      </Tooltip>
    </div>
  );
};

const NFTModal = () => {
  return null;
};

NFTModal.open = ({ data }: ContentProps) => {
  Modal.info({
    centered: true,
    content: <Content data={data} />,
    width: 336,
    cancelText: null,
    closable: false,
    okText: null,
    className: 'nft-modal',
  });
};

export default NFTModal;
