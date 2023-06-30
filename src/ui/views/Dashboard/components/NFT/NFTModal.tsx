import { NFTItem } from '@/background/service/openapi';
import { Button, Tooltip } from 'antd';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { getChain } from '@/utils';
import NFTAvatar from './NFTAvatar';
import { openInTab, splitNumberByStep, useCommonPopupView } from '@/ui/utils';
import { IGAEventSource } from '@/ui/utils/ga-event';
import { ReactComponent as LinkSVG } from '@/ui/assets/nft-view/link.svg';
import clsx from 'clsx';

interface ContentProps {
  data?: NFTItem;
  collectionName?: string;
  onClose?(): void;
}

const calc = (data?: NFTItem) => {
  if (!data || data.usd_price == null) {
    return '-';
  }
  return `$${splitNumberByStep(data.usd_price.toFixed(2))}`;
};

const NFTModal = ({ onClose, data, collectionName }: ContentProps) => {
  const chain = getChain(data?.chain);
  const price = calc(data);
  const history = useHistory();
  const { setVisible } = useCommonPopupView();

  const handleClickSend = () => {
    setVisible(false);
    onClose?.();
    history.push({
      pathname: '/send-nft',
      state: {
        nftItem: data,
      },
      search: `?rbisource=${'nftdetail' as IGAEventSource.ISendNFT}`,
    });
  };

  const onDetail = () => {
    if (data) openInTab(data.detail_url);
  };

  return (
    <div className="nft-preview-card">
      <NFTAvatar
        thumbnail={false}
        content={data?.content}
        type={data?.content_type}
        amount={data?.amount}
      ></NFTAvatar>
      <div className={clsx('nft-preview-card-title', 'flex')}>
        <span>{data?.name || '-'}</span>
        <div
          className="cursor-pointer hover:opacity-60 ml-4"
          onClick={onDetail}
        >
          <LinkSVG />
        </div>
      </div>

      <div className="nft-preview-card-list">
        <div className="nft-preview-card-list-item">
          <div className="nft-preview-card-list-item-label">Collection</div>
          <div className="nft-preview-card-list-item-value">
            {(data?.collection?.name ?? collectionName) || '-'}
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
