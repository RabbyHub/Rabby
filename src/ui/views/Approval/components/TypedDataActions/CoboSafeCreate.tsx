import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import LogoWithText from '../Actions/components/LogoWithText';
import { TypedDataActionData } from './utils';
import IconSafe from '@/ui/assets/walletlogo/safe.svg';

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
            <div>
              <Values.Address address={actionData.multisig_id} />
            </div>
            <ul className="desc-list">
              <li>
                <Values.AddressMemo address={actionData.multisig_id} />
              </li>

              <LogoWithText
                logo={IconSafe}
                text="Safe"
                logoSize={14}
                logoRadius="100%"
                textStyle={{
                  fontWeight: 'normal',
                  fontSize: '13px',
                  lineHeight: '15px',
                  color: '#4B4D59',
                }}
              />
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.coboSafeCreate.descriptionTitle')}</Row>
          <Row>{actionData.desc}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default CoboSafeCreate;
