import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { CollectionWithFloorPrice } from '@debank/rabby-api/dist/types';
import { formatAmount } from '@/ui/utils/number';

interface CollectionData {
  collection: CollectionWithFloorPrice;
  chain: Chain;
}

export interface Props {
  data: CollectionData;
}

export interface CollectionPopupProps extends Props {
  type: 'collection';
}

export const CollectionPopup: React.FC<Props> = ({ data }) => {
  return (
    <div>
      <div className="title">{data.collection.name}</div>
      <Table className="view-more-table">
        <Col>
          <Row>Floor price</Row>
          <Row>
            {data.collection.floor_price !== null
              ? `${formatAmount(data.collection.floor_price)} ETH`
              : '-'}
          </Row>
        </Col>
        <Col>
          <Row>Contract address</Row>
          <Row>
            <Values.Address address={data.collection.id} chain={data.chain} />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
