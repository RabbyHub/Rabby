import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { CollectionWithFloorPrice } from '@rabby-wallet/rabby-api/dist/types';
import { formatAmount } from '@/ui/utils/number';
import styled from 'styled-components';

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

const Title = styled.div`
  font-size: 15px;
  font-weight: 18px;
  color: #333;
  display: flex;
  font-weight: 500;
  margin-bottom: 10px;
  .left {
    color: #4b4d59;
    margin-right: 6px;
    font-weight: normal;
  }
  .right {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export const CollectionPopup: React.FC<Props> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div>
      <Title>
        <span className="left">{t('page.signTx.nftCollection')}</span>
        <span className="right">{data.collection.name}</span>
      </Title>
      <Table className="view-more-table">
        <Col>
          <Row>{t('page.signTx.floorPrice')}</Row>
          <Row>
            {data.collection.floor_price !== null
              ? `${formatAmount(data.collection.floor_price)} ETH`
              : '-'}
          </Row>
        </Col>
        <Col>
          <Row>{t('page.signTx.contractAddress')}</Row>
          <Row>
            <Values.AddressWithCopy
              address={data.collection.id}
              chain={data.chain}
            />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
