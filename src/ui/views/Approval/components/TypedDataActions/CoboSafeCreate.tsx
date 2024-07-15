import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import LogoWithText from '../Actions/components/LogoWithText';
import { TypedDataActionData } from './utils';
import IconSafe from '@/ui/assets/walletlogo/safe.svg';
import { SubCol, SubRow, SubTable } from '../Actions/components/SubTable';

const Wrapper = styled.div``;

const CoboSafeCreate = ({
  data,
}: {
  data: TypedDataActionData['coboSafeCreate'];
}) => {
  const { t } = useTranslation();
  const actionData = data!;

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.coboSafeCreate.safeWalletTitle')}</Row>
          <Row>
            <Values.AddressWithCopy
              id="cobo-safe-address"
              address={actionData.multisig_id}
            />
          </Row>
        </Col>

        <SubTable target="cobo-safe-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
            <SubRow>
              <Values.AddressMemo address={actionData.multisig_id} />
            </SubRow>
          </SubCol>

          <SubCol className="items-center">
            <SubRow isTitle>{t('page.signTx.label')}</SubRow>
            <SubRow>
              <LogoWithText
                logo={IconSafe}
                text="Safe"
                logoSize={14}
                logoRadius="100%"
                textStyle={{
                  fontWeight: 'normal',
                  fontSize: '13px',
                  lineHeight: '15px',
                  color: 'var(--r-neutral-body, #3E495E)',
                }}
              />
            </SubRow>
          </SubCol>
        </SubTable>

        <Col>
          <Row isTitle>{t('page.signTx.coboSafeCreate.descriptionTitle')}</Row>
          <Row wrap>{actionData.desc}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default CoboSafeCreate;
