import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ContractRequireData, TypedDataActionData } from './utils';
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

const BuyNFT = ({
  data,
  requireData,
  chain,
  engineResults,
  sender,
}: {
  data: TypedDataActionData['buyNFT'];
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
    return !isSameAddress(actionData.receiver, sender);
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

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTypedData.buyNFT.payToken')}</Row>
          <Row>
            <LogoWithText
              logo={actionData.pay_token.logo_url}
              text={`${formatAmount(
                actionData.pay_token.amount
              )} ${ellipsisTokenSymbol(getTokenSymbol(actionData.pay_token))}`}
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTypedData.buyNFT.receiveNFT')}</Row>
          <Row>
            <div className="relative">
              <ViewMore
                type="nft"
                data={{
                  nft: actionData.receive_nft,
                  chain,
                }}
              >
                <NFTWithName
                  hasHover
                  nft={actionData.receive_nft}
                  showTokenLabel
                ></NFTWithName>
              </ViewMore>
              {engineResultMap['1086'] && (
                <SecurityLevelTagNoText
                  enable={engineResultMap['1086'].enable}
                  level={
                    processedRules.includes('1086')
                      ? 'proceed'
                      : engineResultMap['1086'].level
                  }
                  onClick={() => handleClickRule('1086')}
                />
              )}
            </div>
            {engineResultMap['1087'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1087'].enable}
                level={
                  processedRules.includes('1087')
                    ? 'proceed'
                    : engineResultMap['1087'].level
                }
                onClick={() => handleClickRule('1087')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTypedData.buyNFT.expireTime')}</Row>
          <Row>
            {actionData.expire_at ? (
              <Values.TimeSpanFuture to={Number(actionData.expire_at)} />
            ) : (
              '-'
            )}
          </Row>
        </Col>
        {hasReceiver && (
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="buy-nft-receiver"
                  address={actionData.receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="buy-nft-receiver">
              <SecurityListItem
                id="1085"
                engineResult={engineResultMap['1085']}
                dangerText={t('page.signTx.swap.notPaymentAddress')}
              />
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
                ...requireData,
                address: requireData.id,
                chain,
                title: t('page.signTypedData.buyNFT.listOn'),
              }}
            >
              <Values.Address
                id="buy-nft-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>

        <SubTable target="buy-nft-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.protocol')}</SubRow>
            <SubRow>
              <ProtocolListItem protocol={requireData.protocol} />
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

export default BuyNFT;
