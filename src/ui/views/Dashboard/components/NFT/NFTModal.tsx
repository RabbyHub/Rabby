import { NFTItem } from '@/background/service/openapi';
import { Button } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { getChain } from 'utils';
import NFTAvatar from './NFTAvatar';
import { splitNumberByStep } from '@/ui/utils';

interface ContentProps {
  data?: NFTItem;
}

const calc = (data?: NFTItem) => {
  if (!data || data.usd_price == null) {
    return '-';
  }
  return `$${splitNumberByStep(data.usd_price.toFixed(2))}`;
};

const NFTModal = ({ data }: ContentProps) => {
  const chain = getChain(data?.chain);
  const price = calc(data);
  const history = useHistory();

  const handleClickSend = () => {
    history.push({
      pathname: '/send-nft',
      state: {
        nftItem: data,
      },
    });
  };

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
      <Button block size="large" onClick={handleClickSend}>
        Send
      </Button>
    </div>
  );
};

// NFTModal.open = ({ data }: ContentProps) => {
//   Modal.info({
//     centered: true,
//     content: <Content data={data} />,
//     width: 336,
//     cancelText: null,
//     closable: false,
//     okText: null,
//     className: 'nft-modal',
//   });
// };

export default NFTModal;
