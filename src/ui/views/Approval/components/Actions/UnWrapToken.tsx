import React, { useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import { ParsedActionData, WrapTokenRequireData } from './utils';
import { formatAmount } from 'ui/utils/number';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import ViewMore from './components/ViewMore';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { SecurityListItem } from './components/SecurityListItem';
import { isSameAddress } from '@/ui/utils';
import { ProtocolListItem } from './components/ProtocolListItem';
import { SubTable, SubCol, SubRow } from './components/SubTable';

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
`;

const UnWrapToken = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['wrapToken'];
  requireData: WrapTokenRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const { payToken, receiveToken, receiver } = data!;

  const { rules, processedRules, contractWhitelist } = useRabbySelector(
    (s) => ({
      contractWhitelist: s.securityEngine.userData.contractWhitelist,
      rules: s.securityEngine.rules,
      processedRules: s.securityEngine.currentTx.processedRules,
    })
  );

  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

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

  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResultMap[id];
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  const hasReceiver = useMemo(() => {
    return !isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.swap.payToken')}</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={
                <>
                  {formatAmount(payToken.amount)}{' '}
                  <Values.TokenSymbol token={payToken} />
                </>
              }
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.swap.receiveToken')}</Row>
          <Row>
            <LogoWithText
              logo={receiveToken.logo_url}
              text={
                <>
                  {formatAmount(receiveToken.min_amount)}{' '}
                  <Values.TokenSymbol token={receiveToken} />
                </>
              }
              logoRadius="100%"
            />
            {engineResultMap['1062'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1062'].enable}
                level={
                  processedRules.includes('1062')
                    ? 'proceed'
                    : engineResultMap['1062'].level
                }
                onClick={() => handleClickRule('1062')}
              />
            )}
          </Row>
        </Col>
        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="unwrap-token-receiver"
                  address={receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="unwrap-token-receiver">
              <SecurityListItem
                engineResult={engineResultMap['1093']}
                id="1093"
                warningText={t('page.signTx.swap.unknownAddress')}
              />
              {!engineResultMap['1093'] && (
                <>
                  <SubCol>
                    <SubRow isTitle>{t('page.signTx.address')}</SubRow>
                    <SubRow>
                      <Values.AccountAlias address={receiver} />
                    </SubRow>
                  </SubCol>
                  <SubCol>
                    <SubRow isTitle>{t('page.addressDetail.source')}</SubRow>
                    <SubRow>
                      <Values.KnownAddress address={receiver} />
                    </SubRow>
                  </SubCol>
                </>
              )}
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
                hasInteraction: requireData.hasInteraction,
                bornAt: requireData.bornAt,
                protocol: requireData.protocol,
                rank: requireData.rank,
                address: requireData.id,
                chain,
              }}
            >
              <Values.Address
                id="unwrap-token-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="unwrap-token-address">
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

          <SecurityListItem
            id="1137"
            engineResult={engineResultMap['1137']}
            warningText={t('page.signTx.markAsBlock')}
            title={t('page.signTx.myMark')}
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default UnWrapToken;
