import React, { useMemo } from 'react';
import styled from 'styled-components';
import { SignMultiSigActions } from '@debank/rabby-api/dist/types';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import { Chain } from 'background/service/openapi';
import { MultiSigRequireData } from './utils';
import LogoWithText from '../Actions/components/LogoWithText';
import { Result } from '@debank/rabby-security-engine';

const Wrapper = styled.div``;

const PushMultiSig = ({
  data,
  requireData,
  chain,
}: {
  data: SignMultiSigActions;
  requireData: MultiSigRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const multiSigInfo = useMemo(() => {
    const contract = requireData.contract?.[chain.serverId];
    if (contract) {
      return contract.multisig;
    }
  }, [requireData, chain]);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Multisig address</Row>
          <Row>
            <div>
              <Values.Address address={data.multisig_id} chain={chain} />
              <ul className="desc-list">
                <li>
                  <Values.AddressMemo address={data.multisig_id} />
                </li>
                {multiSigInfo && (
                  <li>
                    <LogoWithText
                      logo={multiSigInfo.logo_url}
                      text={multiSigInfo.name}
                      logoSize={14}
                      logoRadius="100%"
                      textStyle={{
                        fontWeight: 'normal',
                        fontSize: '13px',
                        lineHeight: '15px',
                        color: '#4B4D59',
                      }}
                    />
                  </li>
                )}
              </ul>
            </div>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default PushMultiSig;
