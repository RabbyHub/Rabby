import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { isSameAddress } from 'ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import ViewMore from '../Actions/components/ViewMore';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import LogoWithText from '../Actions/components/LogoWithText';
import { SubCol, SubRow, SubTable } from './components/SubTable';
import { formatAmount } from 'ui/utils/number';
import {
  ParsedTransactionActionData,
  SwapRequireData,
} from '@rabby-wallet/rabby-action';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
  .icon-scam-token {
    margin-left: 4px;
    width: 13px;
  }
  .icon-fake-token {
    margin-left: 4px;
    width: 13px;
  }
  li .name-and-address {
    justify-content: flex-start;
    .address {
      font-weight: 400;
      font-size: 12px;
      line-height: 14px;
      color: #999999;
    }
    img {
      width: 12px !important;
      height: 12px !important;
      margin-left: 4px !important;
    }
  }
`;

const SwapLimitPay = ({
  data,
  requireData,
  chain,
  engineResults,
  sender,
}: {
  data: ParsedTransactionActionData['swapLimitPay'];
  requireData: SwapRequireData;
  chain: Chain;
  engineResults: Result[];
  sender: string;
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const { rules, processedRules, contractWhitelist } = useRabbySelector(
    (s) => ({
      rules: s.securityEngine.rules,
      processedRules: s.securityEngine.currentTx.processedRules,
      contractWhitelist: s.securityEngine.userData.contractWhitelist,
    })
  );

  const isInWhitelist = useMemo(() => {
    return contractWhitelist.some(
      (item) =>
        item.chainId === chain.serverId &&
        isSameAddress(item.address, requireData.id)
    );
  }, [contractWhitelist, requireData]);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const hasReceiver = useMemo(() => {
    return !isSameAddress(actionData.receiver || '', sender);
  }, [actionData, sender]);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.swap.receiveToken')}</Row>
          <Row>
            <div id="swap-min">
              <LogoWithText
                logo={actionData.receiveToken.logo_url}
                logoRadius="100%"
                text={
                  <>
                    {formatAmount(actionData.receiveToken.amount)}{' '}
                    <Values.TokenSymbol token={actionData.receiveToken} />
                  </>
                }
              />
            </div>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.swapLimitPay.maxPay')}</Row>
          <Row>
            <div id="swap-min">
              <LogoWithText
                logo={actionData.payToken.logo_url}
                logoRadius="100%"
                text={
                  <>
                    {formatAmount(actionData.payToken.max_amount)}{' '}
                    <Values.TokenSymbol token={actionData.payToken} />
                  </>
                }
              />
            </div>
          </Row>
        </Col>
        {hasReceiver && actionData.receiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="swap-limit-pay-receiver"
                  address={actionData.receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="swap-limit-pay-receiver">
              <SecurityListItem
                id="1115"
                engineResult={engineResultMap['1115']}
                dangerText={t('page.signTx.swap.notPaymentAddress')}
              />
            </SubTable>
          </>
        )}
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.interactContract')}
          </Row>
          <Row>
            <ViewMore
              type="contract"
              data={{
                ...requireData,
                address: requireData.id,
                chain,
                title: t('page.signTypedData.buyNFT.listOn'),
              }}
            >
              <Values.Address
                id="swap-limit-pay-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="swap-limit-pay-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.protocol')}</SubRow>
            <SubRow>
              <ProtocolListItem protocol={requireData.protocol} />
            </SubRow>
          </SubCol>

          <SubCol>
            <SubRow isTitle>{t('page.signTx.hasInteraction')}</SubRow>
            <SubRow>
              <Values.Interacted value={requireData.hasInteraction} />
            </SubRow>
          </SubCol>

          {isInWhitelist && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.myMark')}</SubRow>
              <SubRow>{t('page.signTx.trusted')}</SubRow>
            </SubCol>
          )}

          <SecurityListItem
            id="1135"
            engineResult={engineResultMap['1135']}
            forbiddenText={t('page.signTx.markAsBlock')}
            title={t('page.signTx.myMark')}
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default SwapLimitPay;
