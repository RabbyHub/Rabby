import React, { useMemo } from 'react';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import { Chain } from 'background/service/openapi';
import { useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';

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
  title?: string;
}

export interface Props {
  data: ContractData;
}

export interface ContractPopupProps extends Props {
  type: 'contract';
}

export const ContractPopup: React.FC<Props> = ({ data }) => {
  const { contractBlacklist, contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

  const { isInBlackList, isInWhiteList } = useMemo(() => {
    return {
      isInBlackList: contractBlacklist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.address) &&
          chainId === data.chain.serverId
      ),
      isInWhiteList: contractWhitelist.some(
        ({ address, chainId }) =>
          isSameAddress(address, data.address) &&
          chainId === data.chain.serverId
      ),
    };
  }, [data.address, data.chain, contractBlacklist, contractWhitelist]);
  return (
    <div>
      <div className="title">
        {data.title || 'Interact contract'}{' '}
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
        <Col>
          <Row className="bg-[#F6F8FF]">My mark</Row>
          <Row>
            <Values.AddressMark
              isContract
              address={data.address}
              chain={data.chain}
              onBlacklist={isInBlackList}
              onWhitelist={isInWhiteList}
              onChange={() => null}
            />
          </Row>
        </Col>
      </Table>
    </div>
  );
};
