import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ParsedActionData, SendNFTRequireData } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import NFTWithName from './components/NFTWithName';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { SecurityListItem } from './components/SecurityListItem';
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

const SendNFT = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['sendNFT'];
  requireData: SendNFTRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.sendNFT.title')}</Row>
          <Row className="overflow-hidden">
            <ViewMore
              type="nft"
              data={{
                nft: actionData.nft,
                chain,
              }}
            >
              <NFTWithName
                id="send-nft"
                hasHover
                nft={actionData?.nft}
              ></NFTWithName>
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="send-nft">
          {actionData?.nft?.amount > 1 && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.amount')}</SubRow>
              <SubRow>{actionData?.nft?.amount}</SubRow>
            </SubCol>
          )}
        </SubTable>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.send.sendTo')}
          </Row>
          <Row>
            <ViewMore
              type="receiver"
              data={{
                address: actionData.to,
                chain,
                eoa: requireData.eoa,
                cex: requireData.cex,
                contract: requireData.contract,
                usd_value: requireData.usd_value,
                hasTransfer: requireData.hasTransfer,
                isTokenContract: requireData.isTokenContract,
                name: requireData.name,
                onTransferWhitelist: requireData.onTransferWhitelist,
              }}
            >
              <Values.Address
                hasHover
                id="send-nft-address"
                address={actionData.to}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="send-nft-address">
          <SubCol>
            <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
            <SubRow>
              <Values.AddressMemo address={actionData.to} />
            </SubRow>
          </SubCol>
          {!!requireData.contract && (
            <SubCol>
              <SubRow isTitle>{t('page.signTx.addressTypeTitle')}</SubRow>
              <SubRow>{t('page.signTx.contract')}</SubRow>
            </SubCol>
          )}
          {!!requireData.name && (
            <SubCol nested>
              <SubRow> </SubRow>
              <SubRow>
                {requireData.name.replace(/^Token: /, 'Token ') +
                  ' contract address'}
              </SubRow>
            </SubCol>
          )}
          <SecurityListItem
            engineResult={engineResultMap['1037']}
            dangerText={t('page.signTx.send.contractNotOnThisChain')}
            noTitle
            id="1037"
          />
          <SecurityListItem
            title={t('page.signTx.addressSource')}
            engineResult={engineResultMap['1142']}
            safeText={
              requireData.hasReceiverMnemonicInWallet
                ? t('page.signTx.send.fromMySeedPhrase')
                : t('page.signTx.send.fromMyPrivateKey')
            }
            id="1142"
          />
          <SecurityListItem
            engineResult={engineResultMap['1016']}
            dangerText={t('page.signTx.send.receiverIsTokenAddress')}
            id="1016"
          />

          {requireData.cex && (
            <>
              <SubCol>
                <SubRow isTitle>{t('page.signTx.send.cexAddress')}</SubRow>
                <SubRow>
                  <LogoWithText
                    logo={requireData.cex.logo}
                    text={requireData.cex.name}
                    logoSize={14}
                    textStyle={{
                      fontSize: '13px',
                      lineHeight: '15px',
                      color: '#4B4D59',
                      fontWeight: 'normal',
                    }}
                  />
                </SubRow>
              </SubCol>
              <SecurityListItem
                noTitle
                engineResult={engineResultMap['1039']}
                dangerText={t('page.signTx.send.notTopupAddress')}
                id="1039"
              />
              <SecurityListItem
                noTitle
                engineResult={engineResultMap['1038']}
                dangerText={t('page.signTx.sendNFT.nftNotSupport')}
                id="1038"
              />
            </>
          )}
          <SecurityListItem
            title={t('page.signTx.transacted')}
            engineResult={engineResultMap['1036']}
            warningText={<Values.Transacted value={false} />}
            id="1036"
          />
          <SecurityListItem
            title={t('page.signTx.tokenApprove.flagByRabby')}
            engineResult={engineResultMap['1143']}
            dangerText={t('page.signTx.send.scamAddress')}
            id="1143"
          />
          <SecurityListItem
            title={t('page.signTx.send.whitelistTitle')}
            engineResult={engineResultMap['1042']}
            safeText={t('page.signTx.send.onMyWhitelist')}
            id="1042"
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default SendNFT;
