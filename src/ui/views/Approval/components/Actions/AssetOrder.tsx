import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ContractRequireData } from '../TypedDataActions/utils';
import { ParsedActionData } from './utils';
import { isSameAddress } from 'ui/utils';
import { formatAmount, formatUsdValue } from 'ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import NFTWithName from '../Actions/components/NFTWithName';
import * as Values from '../Actions/components/Values';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import ViewMore from '../Actions/components/ViewMore';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import LogoWithText from '../Actions/components/LogoWithText';
import { ellipsisTokenSymbol, getTokenSymbol } from '@/ui/utils/token';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';

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

const AssetOrder = ({
  data,
  requireData,
  chain,
  engineResults,
  sender,
}: {
  data: ParsedActionData['assetOrder'];
  requireData: ContractRequireData;
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
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.assetOrder.listAsset')}</Row>
          <div className="flex-1 overflow-hidden">
            {actionData.payTokenList.map((token) => (
              <Row key={token.id} className="has-bottom-border">
                <div className="relative">
                  <LogoWithText
                    logo={token.logo_url}
                    text={`${formatAmount(token.amount)} ${ellipsisTokenSymbol(
                      getTokenSymbol(token)
                    )}`}
                    logoRadius="100%"
                  />
                </div>
                <ul className="desc-list">
                  <li>
                    ≈
                    {formatUsdValue(
                      new BigNumber(token.amount).times(token.price).toFixed()
                    )}
                  </li>
                </ul>
              </Row>
            ))}
            {actionData.payNFTList.map((nft) => (
              <Row key={nft.id} className="has-bottom-border">
                <NFTWithName nft={nft}></NFTWithName>
                <ul className="desc-list">
                  <li>
                    <ViewMore
                      type="nft"
                      data={{
                        nft,
                        chain,
                      }}
                    />
                  </li>
                </ul>
              </Row>
            ))}
            {actionData.payNFTList.length <= 0 &&
              actionData.payTokenList.length <= 0 && <Row>-</Row>}
          </div>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.assetOrder.receiveAsset')}</Row>
          <div className="flex-1 overflow-hidden">
            {actionData.receiveTokenList.map((token) => (
              <Row key={token.id} className="has-bottom-border">
                <div className="relative">
                  <LogoWithText
                    logo={token.logo_url}
                    text={`${formatAmount(token.amount)} ${ellipsisTokenSymbol(
                      getTokenSymbol(token)
                    )}`}
                    logoRadius="100%"
                  />
                </div>
                <ul className="desc-list">
                  <li>
                    ≈
                    {formatUsdValue(
                      new BigNumber(token.amount).times(token.price).toFixed()
                    )}
                  </li>
                </ul>
              </Row>
            ))}
            {actionData.receiveNFTList.map((nft) => (
              <Row key={nft.id} className="has-bottom-border">
                <NFTWithName nft={nft}></NFTWithName>
                <ul className="desc-list">
                  <li>
                    <ViewMore
                      type="nft"
                      data={{
                        nft,
                        chain,
                      }}
                    />
                  </li>
                </ul>
              </Row>
            ))}
            {actionData.receiveTokenList.length <= 0 &&
              actionData.receiveNFTList.length <= 0 && <Row>-</Row>}
          </div>
        </Col>
        {actionData.takers.length > 0 && (
          <Col>
            <Row isTitle>{t('page.signTypedData.sellNFT.specificBuyer')}</Row>
            <Row>
              <Values.Address address={actionData.takers[0]} chain={chain} />
              {engineResultMap['1114'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1114'].enable}
                  level={
                    processedRules.includes('1114')
                      ? 'proceed'
                      : engineResultMap['1114'].level
                  }
                  onClick={() => handleClickRule('1114')}
                />
              )}
            </Row>
          </Col>
        )}
        {hasReceiver && actionData.receiver && (
          <Col>
            <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
            <Row>
              <Values.Address address={actionData.receiver} chain={chain} />
              <ul className="desc-list">
                <SecurityListItem
                  id="1115"
                  engineResult={engineResultMap['1115']}
                  dangerText={t('page.signTx.swap.notPaymentAddress')}
                />
              </ul>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>{t('page.signTypedData.buyNFT.listOn')}</Row>
          <Row>
            <div>
              <Values.Address address={requireData.id} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

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
                    ...requireData,
                    address: requireData.id,
                    chain,
                    title: t('page.signTypedData.buyNFT.listOn'),
                  }}
                />
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTypedData.buyNFT.expireTime')}</Row>
          <Row>
            {actionData.expireAt ? (
              <Values.TimeSpanFuture to={Number(actionData.expireAt)} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default AssetOrder;
