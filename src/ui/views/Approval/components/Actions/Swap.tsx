import React, { useMemo, useEffect } from 'react';
import { BigNumber } from 'bignumber.js';
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
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(payToken.amount).times(payToken.price).toFixed()
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.swap.receiveToken')}</Row>
          <Row>
            <div className="flex relative pr-10">
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
            <ul className="desc-list">
              {balanceChange.success && balanceChange.support && (
                <>
                  <li>
                    ≈
                    {formatUsdValue(
                      new BigNumber(receiveToken.amount)
                        .times(receiveToken.price)
                        .toFixed()
                    )}
                  </li>
                  <SecurityListItem
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
                </>
              )}
              {balanceChange.support && !balanceChange.success && (
                <li>{t('page.signTx.swap.simulationFailed')}</li>
              )}
              {!balanceChange.support && (
                <li>{t('page.signTx.swap.simulationNotSupport')}</li>
              )}
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.swap.minReceive')}</Row>
          <Row>
            <div>
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
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(minReceive.amount)
                    .times(minReceive.price)
                    .toFixed()
                )}
              </li>
              <li>
                {slippageTolerance === null &&
                  t('page.signTx.swap.slippageFailToLoad')}
                {slippageTolerance !== null && (
                  <>
                    {t('page.signTx.swap.slippageTolerance')}{' '}
                    {hasReceiver ? (
                      '-'
                    ) : (
                      <Values.Percentage value={slippageTolerance} />
                    )}
                  </>
                )}
                {engineResultMap['1011'] && (
                  <SecurityLevelTagNoText
                    enable={engineResultMap['1011'].enable}
                    level={
                      processedRules.includes('1011')
                        ? 'proceed'
                        : engineResultMap['1011'].level
                    }
                    onClick={() => handleClickRule('1011')}
                  />
                )}
              </li>
            </ul>
          </Row>
        </Col>
        {hasReceiver && (
          <Col>
            <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
            <Row>
              <Values.Address address={receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  engineResult={engineResultMap['1069']}
                  id="1069"
                  warningText={t('page.signTx.swap.unknownAddress')}
                />
                {!engineResultMap['1069'] && (
                  <>
                    <li>
                      <Values.AccountAlias address={receiver} />
                    </li>
                    <li>
                      <Values.KnownAddress address={receiver} />
                    </li>
                  </>
                )}
              </ul>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>{t('page.signTx.interactContract')}</Row>
          <Row>
            <div>
              <Values.Address address={requireData.id} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />
              <li>
                <Values.Interacted value={requireData.hasInteraction} />
              </li>

              {isInWhitelist && <li>{t('page.signTx.markAsTrust')}</li>}

              <SecurityListItem
                id="1135"
                engineResult={engineResultMap['1135']}
                forbiddenText={t('page.signTx.markAsBlock')}
              />

              <SecurityListItem
                id="1137"
                engineResult={engineResultMap['1137']}
                warningText={t('page.signTx.markAsBlock')}
              />
              <li>
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
                />
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Swap;
