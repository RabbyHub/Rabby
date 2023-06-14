import React, { useMemo } from 'react';
import styled from 'styled-components';
import { SignMultiSigActions } from '@debank/rabby-api/dist/types';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import { Chain } from 'background/service/openapi';
import { MultiSigRequireData } from './utils';
import LogoWithText from '../Actions/components/LogoWithText';
import { Result } from '@debank/rabby-security-engine';
import { CHAINS } from 'consts';

const Wrapper = styled.div``;

const PushMultiSig = ({
  data,
  requireData,
  chain,
}: {
  data: SignMultiSigActions;
  requireData: MultiSigRequireData;
  chain?: Chain;
  engineResults: Result[];
}) => {
  const multiSigInfo = useMemo(() => {
    if (!chain) {
      for (const key in requireData?.contract) {
        const contract = requireData.contract[key];
        const c = Object.values(CHAINS).find((item) => item.serverId === key);
        if (contract.multisig && c) {
          return {
            ...contract.multisig,
            chain: c,
          };
        }
      }
    } else {
      const contract = requireData.contract?.[chain.serverId];
      if (contract) {
        return { ...contract.multisig, chain };
      }
    }
  }, [requireData, chain]);

  console.log('multiSigInfo', multiSigInfo);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Multisig address</Row>
          <Row>
            <div>
              <Values.Address
                address={data.multisig_id}
                chain={multiSigInfo?.chain}
              />
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
