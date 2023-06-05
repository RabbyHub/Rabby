import React, { useMemo } from 'react';
import { Chain } from 'background/service/openapi';
import { ContractDesc, TokenItem } from '@debank/rabby-api/dist/types';
import { Table, Col, Row } from '../Table';
import * as Values from '../Values';
import LogoWithText from '../LogoWithText';
import { ellipsisTokenSymbol } from '@/ui/utils/token';

interface ReceiverData {
  address: string;
  chain: Chain;
  eoa: {
    id: string;
    bornAt: number;
  } | null;
  cex: {
    id: string;
    name: string;
    logo: string;
    bornAt: number;
    isDeposit: boolean;
    supportToken?: boolean;
  } | null;
  contract: Record<string, ContractDesc> | null;
  usd_value: number;
  hasTransfer: boolean;
  isTokenContract: boolean;
  name: string | null;
  onTransferWhitelist: boolean;
  token?: TokenItem;
}

export interface Props {
  data: ReceiverData;
}

export interface ReceiverPopupProps extends Props {
  type: 'receiver';
}

export const ReceiverPopup: React.FC<Props> = ({ data }) => {
  const receiverType = useMemo(() => {
    if (data.contract) {
      return 'Contract';
    }
    if (data.eoa) {
      return 'EOA';
    }
    if (data.cex) {
      return 'EOA';
    }
  }, [data]);

  const contractOnCurrentChain = useMemo(() => {
    if (!data.contract || !data.contract[data.chain.serverId]) return null;
    return data.contract[data.chain.serverId];
  }, [data]);
  console.log('contractOnCurrentChain', contractOnCurrentChain);

  const bornAt = useMemo(() => {
    if (data.contract) {
      if (contractOnCurrentChain) {
        return contractOnCurrentChain.create_at;
      } else {
        return null;
      }
    }
    if (data.cex) return data.cex.bornAt;
    if (data.eoa) return data.eoa.bornAt;
    return null;
  }, [data]);

  return (
    <div>
      <div className="title">
        Send to <Values.Address address={data.address} chain={data.chain} />
      </div>
      <Table className="view-more-table">
        <Col>
          <Row>Address note</Row>
          <Row>
            <Values.AddressMemo address={data.address} />
          </Row>
        </Col>
        <Col>
          <Row>Type</Row>
          <Row>
            <div>
              {receiverType}
              {((data.contract && !contractOnCurrentChain) ||
                data.name ||
                contractOnCurrentChain?.multisig) && (
                <ul className="desc-list">
                  {contractOnCurrentChain &&
                    contractOnCurrentChain.multisig && (
                      <li>MultiSig: {contractOnCurrentChain.multisig.name}</li>
                    )}
                  {data.contract && !contractOnCurrentChain && (
                    <li>Not on this chain</li>
                  )}
                  {data.name && <li>{data.name}</li>}
                </ul>
              )}
            </div>
          </Row>
        </Col>
        {data.cex && (
          <Col>
            <Row>CEX Address</Row>
            <Row>
              <div>
                <LogoWithText logo={data.cex.logo} text={data.cex.name} />
                {(!data.cex.isDeposit || !data.cex.supportToken) && (
                  <ul className="desc-list">
                    {!data.cex.isDeposit && <li>Not top up address</li>}
                    {!data.cex.supportToken && (
                      <li>
                        {data.token
                          ? ellipsisTokenSymbol(data.token.symbol)
                          : 'token'}{' '}
                        not supported
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </Row>
          </Col>
        )}
        {data.isTokenContract && (
          <Col>
            <Row>Token Address</Row>
            <Row>
              <Values.Boolean value={data.isTokenContract} />
            </Row>
          </Col>
        )}
        <Col>
          <Row>{data.contract ? 'Deployed' : 'First on-chain'}</Row>
          <Row>
            <Values.TimeSpan value={bornAt} />
          </Row>
        </Col>
        <Col>
          <Row>Address Balance</Row>
          <Row>
            <Values.USDValue value={data.usd_value} />
          </Row>
        </Col>
        <Col>
          <Row>Transacted before</Row>
          <Row>
            <Values.Boolean value={data.hasTransfer} />
          </Row>
        </Col>
        <Col>
          <Row>Send whitelist</Row>
          <Row>
            {data.onTransferWhitelist
              ? 'On my send whitelist'
              : 'Not on my send whitelist '}
          </Row>
        </Col>
      </Table>
    </div>
  );
};
