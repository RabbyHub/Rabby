import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import {
  ParsedTransactionActionData,
  AddLiquidityRequireData,
} from '@rabby-wallet/rabby-action';
import { formatAmount } from 'ui/utils/number';
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

const AddLiquidity = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedTransactionActionData['addLiquidity'];
  requireData: AddLiquidityRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const { token0, token1 } = data!;

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
    return !isSameAddress(requireData.receiver, requireData.sender);
  }, [requireData, requireData.receiver]);

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
          <Row isTitle>{t('page.signTx.addLiquidity.token0')}</Row>
          <Row>
            <LogoWithText
              logo={token0.logo_url}
              text={
                <>
                  {formatAmount(token0.amount)}{' '}
                  <Values.TokenSymbol token={token0} />
                </>
              }
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.addLiquidity.token1')}</Row>
          <Row>
            <LogoWithText
              logo={token1.logo_url}
              text={
                <>
                  {formatAmount(token1.amount)}{' '}
                  <Values.TokenSymbol token={token1} />
                </>
              }
              logoRadius="100%"
            />
          </Row>
        </Col>

        <Col>
          <Row isTitle>{t('page.signTx.addLiquidity.poolPrice')}</Row>
          <Row className="text-rabby-neutral-title1">
            <div>
              1 <Values.TokenSymbol token={token0} /> ={' '}
              {formatAmount(requireData.poolRate)}{' '}
              <Values.TokenSymbol token={token1} />
            </div>
          </Row>
        </Col>

        <Col>
          <Row isTitle>{t('page.signTx.addLiquidity.marketPrice')}</Row>
          <Row className="text-rabby-neutral-title1">
            <div>
              1 <Values.TokenSymbol token={token0} /> ={' '}
              {formatAmount(requireData.marketRate)}{' '}
              <Values.TokenSymbol token={token1} />
            </div>
          </Row>
        </Col>

        <Col>
          <Row isTitle>{t('page.signTx.addLiquidity.priceDiff')}</Row>
          <Row className="text-rabby-neutral-title1">
            <span>{formatAmount(requireData.diff)}%</span>
            {engineResultMap['1154'] && (
              <SecurityLevelTagNoText
                inSubTable
                enable={engineResultMap['1154'].enable}
                level={
                  processedRules.includes('1154')
                    ? 'proceed'
                    : engineResultMap['1154'].level
                }
                onClick={() => handleClickRule('1154')}
              />
            )}
          </Row>
        </Col>

        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.addLiquidity.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  address={requireData.receiver}
                  chain={chain}
                />
                {engineResultMap['1153'] && (
                  <SecurityLevelTagNoText
                    inSubTable
                    enable={engineResultMap['1153'].enable}
                    level={
                      processedRules.includes('1153')
                        ? 'proceed'
                        : engineResultMap['1153'].level
                    }
                    onClick={() => handleClickRule('1153')}
                  />
                )}
              </Row>
            </Col>
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
                bornAt: requireData.bornAt,
                protocol: requireData.protocol,
                rank: requireData.rank,
                address: requireData.id,
                hasInteraction: requireData.hasInteraction,
                chain,
              }}
            >
              <Values.Address
                id="add-liquidity-contract"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="add-liquidity-contract">
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

export default AddLiquidity;
