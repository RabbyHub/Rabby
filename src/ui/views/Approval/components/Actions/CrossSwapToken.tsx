import React, { useMemo, useEffect } from 'react';
import { BigNumber } from 'bignumber.js';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useTranslation } from 'react-i18next';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { ParsedActionData, SwapRequireData } from './utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { Chain } from 'background/service/openapi';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { SecurityListItem } from './components/SecurityListItem';
import { ProtocolListItem } from './components/ProtocolListItem';
import { isSameAddress } from '@/ui/utils';

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
const CrossSwapToken = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['crossSwapToken'];
  requireData: SwapRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    usdValueDiff,
    usdValuePercentage,
    receiver,
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

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch.securityEngine.init();
  }, []);

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
              <li>
                <Values.DisplayChain chainServerId={payToken.chain} />
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.swap.minReceive')}</Row>
          <Row>
            <div className="flex relative pr-10">
              <LogoWithText
                logo={receiveToken.logo_url}
                logoRadius="100%"
                text={
                  <>
                    {formatAmount(receiveToken.min_amount)}{' '}
                    <Values.TokenSymbol token={receiveToken} />
                  </>
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
              {engineResultMap['1107'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1107'].enable}
                  level={
                    processedRules.includes('1107')
                      ? 'proceed'
                      : engineResultMap['1107'].level
                  }
                  onClick={() => handleClickRule('1107')}
                />
              )}
              {engineResultMap['1108'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1108'].enable}
                  level={
                    processedRules.includes('1108')
                      ? 'proceed'
                      : engineResultMap['1108'].level
                  }
                  onClick={() => handleClickRule('1108')}
                />
              )}
            </div>
            <ul className="desc-list">
              <li>
                ≈
                {formatUsdValue(
                  new BigNumber(receiveToken.min_amount)
                    .times(receiveToken.price)
                    .toFixed()
                )}
              </li>
              <li>
                <Values.DisplayChain chainServerId={receiveToken.chain} />
              </li>
              <SecurityListItem
                engineResult={engineResultMap['1104']}
                id="1104"
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
            </ul>
          </Row>
        </Col>
        {engineResultMap['1096'] && (
          <Col>
            <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
            <Row>
              <Values.Address address={receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  engineResult={engineResultMap['1096']}
                  id="1096"
                  dangerText={t('page.signTx.swap.notPaymentAddress')}
                />
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

export default CrossSwapToken;
