import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { CollectionWithFloorPrice } from '@rabby-wallet/rabby-api/dist/types';
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
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex mb-10 text-[15px] font-medium text-r-neutral-title-1">
        <span className="left mr-6 font-normal text-r-neutral-body">
          {t('page.signTx.nftCollection')}
        </span>
        <span className="right flex-1 truncate">{data.collection.name}</span>
      </div>
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
