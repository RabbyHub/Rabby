import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { SignMultiSigActions } from '@rabby-wallet/rabby-api/dist/types';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import { Chain } from 'background/service/openapi';
import { MultiSigRequireData } from './utils';
import LogoWithText from '../Actions/components/LogoWithText';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { CHAINS } from 'consts';
import { findChain } from '@/utils/chain';
import { SubCol, SubRow, SubTable } from '../Actions/components/SubTable';

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
  const { t } = useTranslation();

  const multiSigInfo = useMemo(() => {
    if (!chain) {
      for (const key in requireData?.contract) {
        const contract = requireData.contract[key];
        const c = findChain({
          serverId: key,
        });
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

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.submitMultisig.multisigAddress')}</Row>
          <Row>
            <Values.AddressWithCopy
              id="multi-sign-address"
              address={data.multisig_id}
              chain={multiSigInfo?.chain}
            />
          </Row>
        </Col>

        <SubTable target="multi-sign-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
            <SubRow>
              <Values.AddressMemo address={data.multisig_id} />
            </SubRow>
          </SubCol>
          {multiSigInfo && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.label')}</SubRow>
              <SubRow>
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
              </SubRow>
            </SubCol>
          )}
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default PushMultiSig;
