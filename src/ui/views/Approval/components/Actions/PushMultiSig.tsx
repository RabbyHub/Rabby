import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { PushMultiSigAction } from '@rabby-wallet/rabby-api/dist/types';
import { Col, Row, Table } from './components/Table';
import * as Values from './components/Values';
import { Chain } from 'background/service/openapi';
import { PushMultiSigRequireData } from './utils';
import LogoWithText from './components/LogoWithText';

const Wrapper = styled.div``;

const PushMultiSig = ({
  data,
  requireData,
  chain,
}: {
  data: PushMultiSigAction;
  requireData: PushMultiSigRequireData;
  chain: Chain;
}) => {
  const { t } = useTranslation();
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
          <Row isTitle>{t('page.signTx.submitMultisig.multisigAddress')}</Row>
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
