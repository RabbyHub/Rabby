import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { ParsedActionData, SwapRequireData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { SecurityListItem } from './components/SecurityListItem';
import { ProtocolListItem } from './components/ProtocolListItem';
import { SubCol, SubRow, SubTable } from './components/SubTable';

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
const Swap = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['swap'];
  requireData: SwapRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    slippageTolerance,
    usdValueDiff,
    usdValuePercentage,
    minReceive,
    receiver,
    balanceChange,
  } = data!;

  const { t } = useTranslation();

  const { rules, processedRules, contractWhitelist } = useRabbySelector(
    (s) => ({
      rules: s.securityEngine.rules,
      processedRules: s.securityEngine.currentTx.processedRules,
      contractWhitelist: s.securityEngine.userData.contractWhitelist,
    })
  );
  const dispatch = useRabbyDispatch();

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
    return !isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

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
            <div className="flex relative" id="swap-receive">
              <LogoWithText
                logo={receiveToken.logo_url}
                logoRadius="100%"
                text={
                  balanceChange.success && balanceChange.support ? (
                    <>
                      {formatAmount(receiveToken.amount)}{' '}
                      <Values.TokenSymbol token={receiveToken} />
                    </>
                  ) : (
                    t('page.signTx.swap.failLoadReceiveToken')
                  )
                }
                icon={
                  <Values.TokenLabel
                    isFake={receiveToken.is_verified === false}
                    isScam={
                      receiveToken.is_verified !== false &&
                      !!receiveToken.is_suspicious
                    }
                  />
                }
              />
              {engineResultMap['1008'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1008'].enable}
                  level={
                    processedRules.includes('1008')
                      ? 'proceed'
                      : engineResultMap['1008'].level
                  }
                  onClick={() => handleClickRule('1008')}
                />
              )}
              {engineResultMap['1009'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1009'].enable}
                  level={
                    processedRules.includes('1009')
                      ? 'proceed'
                      : engineResultMap['1009'].level
                  }
                  onClick={() => handleClickRule('1009')}
                />
              )}
            </div>
          </Row>
        </Col>

        <SubTable target="swap-receive">
          {balanceChange.success && balanceChange.support && (
            <SecurityListItem
              title={t('page.signTx.swap.valueDiff')}
              engineResult={engineResultMap['1012']}
              id="1012"
              dangerText={
                <>
                  {t('page.signTx.swap.valueDiff')}{' '}
                  <Values.Percentage value={usdValuePercentage!} /> (
                  {formatUsdValue(usdValueDiff || '')})
                </>
              }
              warningText={
                <>
                  {t('page.signTx.swap.valueDiff')}{' '}
                  <Values.Percentage value={usdValuePercentage!} /> (
                  {formatUsdValue(usdValueDiff || '')})
                </>
              }
            />
          )}
          {balanceChange.support && !balanceChange.success && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.swap.valueDiff')}</SubRow>
              <SubRow>{t('page.signTx.swap.simulationFailed')}</SubRow>
            </SubCol>
          )}
          {!balanceChange.support && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.swap.valueDiff')}</SubRow>
              <SubRow>{t('page.signTx.swap.simulationNotSupport')}</SubRow>
            </SubCol>
          )}
        </SubTable>
        <Col>
          <Row isTitle>{t('page.signTx.swap.minReceive')}</Row>
          <Row>
            <div id="swap-min">
              <LogoWithText
                logo={minReceive.logo_url}
                logoRadius="100%"
                text={
                  <>
                    {formatAmount(minReceive.amount)}{' '}
                    <Values.TokenSymbol token={minReceive} />
                  </>
                }
              />
            </div>
          </Row>
        </Col>
        <SubTable target="swap-min">
          {slippageTolerance === null && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.swap.slippageTolerance')}</SubRow>
              <SubRow>{t('page.signTx.swap.slippageFailToLoad')}</SubRow>
            </SubCol>
          )}
          {slippageTolerance !== null && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.swap.slippageTolerance')}</SubRow>
              <SubRow>
                {hasReceiver ? (
                  '-'
                ) : (
                  <Values.Percentage value={slippageTolerance} />
                )}

                {engineResultMap['1011'] && (
                  <SecurityLevelTagNoText
                    inSubTable
                    enable={engineResultMap['1011'].enable}
                    level={
                      processedRules.includes('1011')
                        ? 'proceed'
                        : engineResultMap['1011'].level
                    }
                    onClick={() => handleClickRule('1011')}
                  />
                )}
              </SubRow>
            </SubCol>
          )}
        </SubTable>
        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="swap-receiver"
                  address={receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="swap-receiver">
              <SecurityListItem
                engineResult={engineResultMap['1069']}
                id="1069"
                warningText={t('page.signTx.swap.unknownAddress')}
              />
              {!engineResultMap['1069'] && (
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
                id="swap-contract"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="swap-contract">
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
            title={t('page.signTx.myMark')}
            id="1135"
            engineResult={engineResultMap['1135']}
            forbiddenText={t('page.signTx.markAsBlock')}
          />
          <SecurityListItem
            title={t('page.signTx.myMark')}
            id="1137"
            engineResult={engineResultMap['1137']}
            warningText={t('page.signTx.markAsBlock')}
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default Swap;
