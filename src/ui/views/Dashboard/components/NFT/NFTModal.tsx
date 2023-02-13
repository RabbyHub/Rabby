import { NFTItem } from '@/background/service/openapi';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { getChain } from '@/utils';
import NFTAvatar from './NFTAvatar';
import { splitNumberByStep } from '@/ui/utils';
import { IGAEventSource } from '@/ui/utils/ga-event';

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
      search: `?rbisource=${'nftdetail' as IGAEventSource.ISendNFT}`,
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
      <Tooltip
        title={
          !data?.is_erc1155 && !data?.is_erc721
            ? 'Only ERC 721 and ERC 1155 NFTs are supported for now'
            : null
        }
        overlayClassName="rectangle"
      >
        <Button
          block
          size="large"
          type="primary"
          onClick={handleClickSend}
          disabled={!data?.is_erc1155 && !data?.is_erc721}
        >
          Send
        </Button>
      </Tooltip>
    </div>
  );
};

export default NFTModal;
