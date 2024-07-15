import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ContractRequireData } from '../TypedDataActions/utils';
import { ParsedActionData } from './utils';
import { isSameAddress } from 'ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from '../Actions/components/Table';
import NFTWithName from '../Actions/components/NFTWithName';
import * as Values from '../Actions/components/Values';
import { SecurityListItem } from '../Actions/components/SecurityListItem';
import ViewMore from '../Actions/components/ViewMore';
import { ProtocolListItem } from '../Actions/components/ProtocolListItem';
import LogoWithText from '../Actions/components/LogoWithText';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
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

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.assetOrder.listAsset')}</Row>
          <Row className="gap-y-6 flex flex-col overflow-hidden items-end">
            {actionData.payTokenList.map((token) => (
              <LogoWithText
                className="overflow-hidden w-full"
                key={token.id}
                logo={token.logo_url}
                text={
                  <div className="overflow-hidden overflow-ellipsis flex">
                    <Values.TokenAmount value={token.amount} />
                    <span className="ml-2">
                      <Values.TokenSymbol token={token} />
                    </span>
                  </div>
                }
                logoRadius="100%"
              />
            ))}
            {actionData.payNFTList.map((nft) => (
              <ViewMore
                key={nft.id}
                type="nft"
                data={{
                  nft,
                  chain,
                }}
              >
                <NFTWithName hasHover nft={nft}></NFTWithName>
              </ViewMore>
            ))}
            {actionData.payNFTList.length <= 0 &&
              actionData.payTokenList.length <= 0 && <>-</>}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signTx.assetOrder.receiveAsset')}</Row>
          <Row className="w-0">
            <div className="gap-y-6 flex flex-col items-end overflow-hidden">
              {actionData.receiveTokenList.map((token) => (
                <LogoWithText
                  className="overflow-hidden w-full"
                  key={token.id}
                  logo={token.logo_url}
                  text={
                    <div className="overflow-hidden overflow-ellipsis flex">
                      <Values.TokenAmount value={token.amount} />
                      <span className="ml-2">
                        <Values.TokenSymbol token={token} />
                      </span>
                    </div>
                  }
                  logoRadius="100%"
                />
              ))}
              {actionData.receiveNFTList.map((nft) => (
                <ViewMore
                  key={nft.id}
                  type="nft"
                  data={{
                    nft,
                    chain,
                  }}
                >
                  <NFTWithName nft={nft}></NFTWithName>
                </ViewMore>
              ))}
              {actionData.receiveTokenList.length <= 0 &&
                actionData.receiveNFTList.length <= 0 && <>-</>}
            </div>
            {engineResultMap['1144'] && (
              <SecurityLevelTagNoText
                enable={engineResultMap['1144'].enable}
                level={
                  processedRules.includes('1144')
                    ? 'proceed'
                    : engineResultMap['1144'].level
                }
                onClick={() => handleClickRule('1144')}
              />
            )}
          </Row>
        </Col>
        {actionData.takers.length > 0 && (
          <Col>
            <Row isTitle>{t('page.signTypedData.sellNFT.specificBuyer')}</Row>
            <Row>
              <Values.AddressWithCopy
                address={actionData.takers[0]}
                chain={chain}
              />
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
          <>
            <Col>
              <Row isTitle>{t('page.signTx.swap.receiver')}</Row>
              <Row>
                <Values.AddressWithCopy
                  id="asset-order-receiver"
                  address={actionData.receiver}
                  chain={chain}
                />
              </Row>
            </Col>
            <SubTable target="asset-order-receiver">
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
                id="asset-order-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="asset-order-address">
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
