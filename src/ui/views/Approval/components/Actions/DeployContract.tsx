import React from 'react';
import styled from 'styled-components';
import { Col, Row, Table } from './components/Table';

const Wrapper = styled.div``;

const DeployContract = () => {
  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle className="w-[90px]">
            Description
          </Row>
          <Row>You are deploying a smart contract</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default DeployContract;
