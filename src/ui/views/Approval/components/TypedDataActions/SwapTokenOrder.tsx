import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { SwapTokenOrderRequireData, TypedDataActionData } from './utils';
import { formatAmount, formatUsdValue } from '@/ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import LogoWithText from '../Actions/components/LogoWithText';
import * as Values from '../Actions/components/Values';
import ViewMore from '../Actions/components/ViewMore';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress } from '@/ui/utils';
import { SubCol, SubRow, SubTable } from '../Actions/components/SubTable';

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

const Permit = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: TypedDataActionData['swapTokenOrder'];
  requireData: SwapTokenOrderRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    usdValueDiff,
    usdValuePercentage,
    receiver,
    expireAt,
  } = data!;
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

  const hasReceiver = useMemo(() => {
    return !isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

  const dispatch = useRabbyDispatch();

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
          <Row isTitle>{t('page.signTx.swap.minReceive')}</Row>
          <Row>
            <LogoWithText
              id="swap-token-order-receive"
              logo={receiveToken.logo_url}
              logoRadius="100%"
              text={
                <>
                  {formatAmount(receiveToken.amount)}{' '}
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
            {engineResultMap['1090'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1090'].enable}
                level={
                  processedRules.includes('1090')
                    ? 'proceed'
                    : engineResultMap['1090'].level
                }
                onClick={() => handleClickRule('1090')}
              />
            )}
            {engineResultMap['1091'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1091'].enable}
                level={
                  processedRules.includes('1091')
                    ? 'proceed'
                    : engineResultMap['1091'].level
                }
                onClick={() => handleClickRule('1091')}
              />
            )}
          </Row>
        </Col>
        <SubTable target="swap-token-order-receive">
          <SecurityListItem
            engineResult={engineResultMap['1095']}
            id="1095"
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
        {expireAt && (
          <Col>
            <Row isTitle>{t('page.signTypedData.buyNFT.expireTime')}</Row>
            <Row>
              <Values.TimeSpanFuture to={expireAt} />
            </Row>
          </Col>
        )}
        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="swap-token-order-receiver"
                  address={receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="swap-token-order-receiver">
              <SecurityListItem
                engineResult={engineResultMap['1094']}
                id="1094"
                warningText={t('page.signTx.swap.unknownAddress')}
              />
              {!engineResultMap['1094'] && (
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
            {t('page.signTypedData.buyNFT.listOn')}
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
                title: t('page.signTypedData.buyNFT.listOn'),
              }}
            >
              <Values.Address
                id="swap-token-order-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="swap-token-order-address">
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

export default Permit;
