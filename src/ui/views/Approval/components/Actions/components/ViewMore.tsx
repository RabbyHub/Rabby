import React, { useState } from 'react';
import styled from 'styled-components';
import { Popup } from 'ui/component';
import { Chain } from 'background/service/openapi';
import { Table, Col, Row } from './Table';
import * as Values from './Values';

interface ContractData {
  address: string;
  chain: Chain;
  protocol: {
    name: string;
    logo_url: string;
  } | null;
  hasInteraction: boolean;
  bornAt: number | null;
  rank: number | null;
}

interface SpenderData {
  address: string;
  chainId: string;
}

interface ReceiverData {
  address: string;
}

interface Props {
  actionType: string;
  type: 'contract' | 'spender' | 'receiver';
  data: ContractData | SpenderData | ReceiverData;
}

const PopupContainer = styled.div`
  .title {
    font-size: 16px;
    line-height: 19px;
    color: #333333;
    display: flex;
    margin-bottom: 14px;
    .value-address {
      font-weight: 500;
      margin-left: 7px;
    }
  }
  .view-more-table {
    .row {
      &:nth-child(1) {
        max-width: 140px;
        border-right: 1px solid #ededed;
        flex-shrink: 0;
      }
    }
  }
`;

const ContractPopup = ({ data }: { data: ContractData }) => {
  return (
    <div>
      <div className="title">
        Interact contract{' '}
        <Values.Address address={data.address} chain={data.chain} />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row>Protocol</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row>Interacted before</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row>Deployed</Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row>Popularity</Row>
          <Row>{data.rank ? `No.${data.rank} on ${data.chain.name}` : '-'}</Row>
        </Col>
        <Col>
          <Row>Address note</Row>
          <Row>
            <Values.AddressMemo address={data.address} />
          </Row>
        </Col>
      </Table>
    </div>
  );
};

const ViewMore = ({ type, data, actionType }: Props) => {
  const [popupVisible, setPopupVisible] = useState(false);

  const handleClickViewMore = () => {
    setPopupVisible(true);
  };

  return (
    <>
      <span className="underline cursor-pointer" onClick={handleClickViewMore}>
        View more
      </span>
      <Popup
        visible={popupVisible}
        closable
        onClose={() => setPopupVisible(false)}
        height={304}
      >
        <PopupContainer>
          {type === 'contract' && <ContractPopup data={data as ContractData} />}
        </PopupContainer>
      </Popup>
    </>
  );
};

export default ViewMore;
