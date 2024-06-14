import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import NFTWithName from '../NFTWithName';
import { NFTItem } from '@rabby-wallet/rabby-api/dist/types';
import { formatAmount } from '@/ui/utils/number';

interface NFTData {
  nft: NFTItem;
  chain: Chain;
}

export interface Props {
  data: NFTData;
}

export interface NFTPopupProps extends Props {
  type: 'nft';
}

export const NFTPopup: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="title flex">
        <span className="mr-16 text-15 text-r-neutral-body">NFT</span>
        <NFTWithName
          nft={data.nft}
          textStyle={{
            fontSize: '15px',
            lineHeight: '18px',
          }}
        />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row>{t('page.signTx.collectionTitle')}</Row>
          <Row>{data.nft.collection ? data.nft.collection.name : '-'}</Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.floorPrice')}</Row>
          <Row>
            {data.nft?.collection?.floor_price
              ? `${formatAmount(data?.nft?.collection?.floor_price)} ETH`
              : '-'}
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.contractAddress')}</Row>
          <Row>
            <Values.AddressWithCopy
              address={data.nft.contract_id}
              chain={data.chain}
            />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
