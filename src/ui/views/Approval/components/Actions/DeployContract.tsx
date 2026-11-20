import React from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { formatTokenAmount } from 'ui/utils/number';
import { Col, Row, Table } from './components/Table';

const DeployContract = ({
  payNativeTokenAmount,
  nativeTokenSymbol,
}: {
  payNativeTokenAmount: string | number;
  nativeTokenSymbol: string;
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.deployContract.descriptionTitle')}</Row>
          <Row wrap>{t('page.signTx.deployContract.description')}</Row>
        </Col>
        {new BigNumber(payNativeTokenAmount).gt(0) && (
          <Col>
            <Row isTitle>
              {t('page.signTx.contractCall.payNativeToken', {
                symbol: nativeTokenSymbol,
              })}
            </Row>
            <Row>
              {formatTokenAmount(
                new BigNumber(payNativeTokenAmount).div(1e18).toFixed()
              )}{' '}
              {nativeTokenSymbol}
            </Row>
          </Col>
        )}
      </Table>
    </div>
  );
};

export default DeployContract;
