import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Col, Row, Table } from './components/Table';

const Wrapper = styled.div``;

const DeployContract = () => {
  const { t } = useTranslation();

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.deployContract.descriptionTitle')}</Row>
          <Row wrap>{t('page.signTx.deployContract.description')}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default DeployContract;
