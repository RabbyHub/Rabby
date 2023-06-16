import React from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';

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

export interface Props {
  data: ContractData;
}

export interface ContractPopupProps extends Props {
  type: 'contract';
}

export const ContractPopup: React.FC<Props> = ({ data }) => {
  return (
    <div>
      <div className="title">
        Interact contract{' '}
        <Values.Address
          address={data.address}
          chain={data.chain}
          iconWidth="14px"
        />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row className="bg-[#F6F8FF]">Protocol</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Interacted before</Row>
          <Row>
            <Values.Boolean value={data.hasInteraction} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Deployed time</Row>
          <Row>
            <Values.TimeSpan value={data.bornAt} />
          </Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Popularity</Row>
          <Row>{data.rank ? `No.${data.rank} on ${data.chain.name}` : '-'}</Row>
        </Col>
        <Col>
          <Row className="bg-[#F6F8FF]">Address note</Row>
          <Row>
            <Values.AddressMemo address={data.address} />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
