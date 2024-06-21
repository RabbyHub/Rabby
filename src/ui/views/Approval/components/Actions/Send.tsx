import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ParsedActionData, SendRequireData } from './utils';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsisTokenSymbol, getTokenSymbol } from 'ui/utils/token';
import { useRabbyDispatch } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import LogoWithText from './components/LogoWithText';
import ViewMore from './components/ViewMore';
import { SecurityListItem } from './components/SecurityListItem';
import { SubCol, SubRow, SubTable } from './components/SubTable';
import { ALIAS_ADDRESS } from '@/constant';
import RabbyChainLogo from '@/ui/assets/rabby-chain-logo.png';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
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

const Send = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['send'];
  requireData: SendRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const actionData = data!;
  const { t } = useTranslation();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const isLabelAddress =
    requireData.name && Object.values(ALIAS_ADDRESS).includes(requireData.name);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.send.sendToken')}</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={
                <>
                  {formatTokenAmount(actionData.token.amount)}{' '}
                  <Values.TokenSymbol token={actionData.token} />
                </>
              }
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle itemsCenter>
            {t('page.signTx.send.sendTo')}
          </Row>
          <Row>
            <ViewMore
              type="receiver"
              data={{
                token: actionData.token,
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
                hasReceiverMnemonicInWallet:
                  requireData.hasReceiverMnemonicInWallet,
                hasReceiverPrivateKeyInWallet:
                  requireData.hasReceiverPrivateKeyInWallet,
              }}
            >
              <Values.Address
                id="send-contract"
                hasHover
                address={actionData.to}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="send-contract">
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
            <SubCol nested={!isLabelAddress}>
              <SubRow isTitle>
                {isLabelAddress ? t('page.signTx.label') : ' '}
              </SubRow>
              <SubRow>
                {isLabelAddress ? (
                  <LogoWithText
                    text={requireData.name}
                    logo={RabbyChainLogo}
                    logoRadius="100%"
                    logoSize={14}
                    textStyle={{
                      fontSize: '13px',
                      color: 'var(--r-neutral-body, #3E495E)',
                    }}
                  />
                ) : (
                  requireData.name.replace(/^Token: /, 'Token ') +
                  ' contract address'
                )}
              </SubRow>
            </SubCol>
          )}
          <SecurityListItem
            engineResult={engineResultMap['1019']}
            dangerText={t('page.signTx.send.contractNotOnThisChain')}
            noTitle
            id="1019"
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
            dangerText={t('page.signTx.yes')}
            title={t('page.signTx.send.receiverIsTokenAddress')}
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
                engineResult={engineResultMap['1021']}
                dangerText={t('page.signTx.send.notTopupAddress')}
                id="1021"
              />
              <SecurityListItem
                noTitle
                engineResult={engineResultMap['1020']}
                dangerText={t('page.signTx.send.tokenNotSupport', [
                  ellipsisTokenSymbol(getTokenSymbol(actionData.token)),
                ])}
                id="1020"
              />
            </>
          )}
          <SecurityListItem
            title={t('page.signTx.transacted')}
            engineResult={engineResultMap['1018']}
            warningText={<Values.Transacted value={false} />}
            id="1018"
          />
          <SecurityListItem
            title={t('page.signTx.tokenApprove.flagByRabby')}
            engineResult={engineResultMap['1143']}
            dangerText={t('page.signTx.send.scamAddress')}
            id="1143"
          />
          <SecurityListItem
            title={t('page.signTx.send.whitelistTitle')}
            engineResult={engineResultMap['1033']}
            safeText={t('page.signTx.send.onMyWhitelist')}
            id="1033"
          />
        </SubTable>
      </Table>
    </Wrapper>
  );
};

export default Send;
