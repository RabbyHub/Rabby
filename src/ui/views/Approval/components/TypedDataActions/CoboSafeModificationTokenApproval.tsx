import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Col, Row, Table } from '../Actions/components/Table';
import { TypedDataActionData } from './utils';
import * as Values from '../Actions/components/Values';
import LogoWithText from '../Actions/components/LogoWithText';

const Wrapper = styled.div``;

const CoboSafeModificationTokenApproval = ({
  data,
}: {
  data: TypedDataActionData['coboSafeModificationTokenApproval'];
}) => {
  const { t } = useTranslation();
  const actionData = data!;

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>
            {t('page.signTx.coboSafeModificationTokenApproval.safeWalletTitle')}
          </Row>
          <Row>
            <div>
              <Values.Address address={actionData.multisig_id} />
            </div>
            <ul className="desc-list">
              <li>
                <Values.AddressMemo address={actionData.multisig_id} />
              </li>
              <LogoWithText
                logo={actionData.brand.logo_url}
                text={actionData.brand.name}
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
          <Row isTitle>
            {t(
              'page.signTx.coboSafeModificationTokenApproval.descriptionTitle'
            )}
          </Row>
          <Row>{actionData.desc}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default CoboSafeModificationTokenApproval;
