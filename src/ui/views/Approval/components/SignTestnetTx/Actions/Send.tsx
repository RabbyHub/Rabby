import { ParsedTransactionActionData } from '@rabby-wallet/rabby-action';
import { Chain } from 'background/service/openapi';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { formatTokenAmount } from 'ui/utils/number';
import LogoWithText from '../../Actions/components/LogoWithText';
import { SubCol, SubRow, SubTable } from '../../Actions/components/SubTable';
import { Col, Row, Table } from '../../Actions/components/Table';
import * as Values from '../../Actions/components/Values';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-scam-token {
    margin-left: 4px;
    width: 13px;
  }
  .icon-fake-token {
    margin-left: 4px;
    width: 13px;
  }
`;

export const TestnetSendAction = ({
  data,
  chain,
}: {
  data: ParsedTransactionActionData['send'];
  chain: Chain;
}) => {
  const actionData = data!;
  const { t } = useTranslation();

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.send.sendToken')}</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={
                <>
                  {formatTokenAmount(actionData.token.amount)}{' '}
                  <Values.TokenSymbol token={actionData.token} />
                </>
              }
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.send.sendTo')}
          </Row>
          <Row>
            <Values.Address
              id="send-contract"
              hasHover
              address={actionData.to}
              chain={chain}
            />
          </Row>
        </Col>
        <SubTable target="send-contract">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
            <SubRow>
              <Values.AddressMemo address={actionData.to} />
            </SubRow>
          </SubCol>
          {/* {requireData.protocol && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.protocol')}</SubRow>
              <SubRow>
                <Values.Protocol value={requireData.protocol} />
              </SubRow>
            </SubCol>
          )}
          {!!requireData.name && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.addressTypeTitle')}</SubRow>
              <SubRow>{t('page.signTx.contract')}</SubRow>
            </SubCol>
          )}
          {!!requireData.name && (
            <SubCol nested={!isLabelAddress}>
              <SubRow isTitle>
                {isLabelAddress ? t('page.signTx.label') : ' '}
              </SubRow>
              <SubRow>
                {isLabelAddress ? (
                  <LogoWithText
                    text={requireData.name}
                    logo={RabbyChainLogo}
                    logoRadius="100%"
                    logoSize={14}
                    textStyle={{
                      fontSize: '13px',
                      color: 'var(--r-neutral-body, #3E495E)',
                    }}
                  />
                ) : (
                  requireData.name.replace(/^Token: /, 'Token ')
                )}
              </SubRow>
            </SubCol>
          )} */}
        </SubTable>
      </Table>
    </Wrapper>
  );
};
