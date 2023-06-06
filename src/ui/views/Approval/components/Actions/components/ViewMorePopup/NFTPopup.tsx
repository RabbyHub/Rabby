import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import NFTWithName from '../NFTWithName';
import { NFTItem } from '@debank/rabby-api/dist/types';
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
  return (
    <div>
      <div className="title flex">
        <span className="mr-16 text-15 text-gray-subTitle">NFT</span>
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
          <Row>Collection</Row>
          <Row>{data.nft.collection ? data.nft.collection.name : '-'}</Row>
        </Col>
        <Col>
          <Row>Floor price</Row>
          <Row>
            {data.nft?.collection?.floor_price
              ? `${formatAmount(data?.nft?.collection?.floor_price)} ETH`
              : '-'}
          </Row>
        </Col>
        <Col>
          <Row>Contract address</Row>
          <Row>
            <Values.Address address={data.nft.contract_id} chain={data.chain} />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
