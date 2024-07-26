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
              id="cross-swap-token-pay"
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
        <SubTable target="cross-swap-token-pay">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.chain')}</SubRow>
            <SubRow>
              <Values.DisplayChain chainServerId={payToken.chain} />
            </SubRow>
          </SubCol>
        </SubTable>

        <Col>
          <Row isTitle>{t('page.signTx.swap.minReceive')}</Row>
          <Row>
            <LogoWithText
              id="cross-swap-token-receive"
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
          </Row>
        </Col>
        <SubTable target="cross-swap-token-receive">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.chain')}</SubRow>
            <SubRow>
              <Values.DisplayChain chainServerId={receiveToken.chain} />
            </SubRow>
          </SubCol>
          <SecurityListItem
            engineResult={engineResultMap['1104']}
            id="1104"
            dangerText={
              <>
                <Values.Percentage value={usdValuePercentage!} /> (
                {formatUsdValue(usdValueDiff || '')})
              </>
            }
            warningText={
              <>
                <Values.Percentage value={usdValuePercentage!} /> (
                {formatUsdValue(usdValueDiff || '')})
              </>
            }
            title={t('page.signTx.swap.valueDiff')}
          />
        </SubTable>
        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="cross-swap-token-receiver"
                  address={receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="cross-swap-token-receiver">
              <SecurityListItem
                engineResult={engineResultMap['1096']}
                id="1096"
                warningText={t('page.signTx.swap.unknownAddress')}
              />
              {!engineResultMap['1096'] && (
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
                id="cross-swap-token-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="cross-swap-token-address">
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

export default CrossSwapToken;
