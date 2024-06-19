import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { ContractCallRequireData, ParsedActionData } from './utils';
import { formatTokenAmount } from 'ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Table, Col, Row } from './components/Table';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { ProtocolListItem } from './components/ProtocolListItem';
import { SecurityListItem } from './components/SecurityListItem';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { isSameAddress } from '@/ui/utils';
import { SubTable, SubCol, SubRow } from './components/SubTable';

const Wrapper = styled.div`
  .contract-call-header {
    border-bottom: 1px solid #ededed;
    padding-bottom: 15px;
    .alert {
      display: flex;
      margin-bottom: 9px;
      align-items: center;
      font-weight: 500;
      font-size: 12px;
      line-height: 14px;
      color: #333333;
      .icon-alert {
        margin-right: 6px;
        width: 15px;
      }
    }
  }
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

const ContractCall = ({
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['contractCall'];
  requireData: ContractCallRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const dispatch = useRabbyDispatch();
  const { t } = useTranslation();
  const { contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

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

  return (
    <Wrapper>
      <Table>
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
                id="contract-call-address"
                hasHover
                address={requireData.id}
                chain={chain}
              />
            </ViewMore>
          </Row>
        </Col>
        <SubTable target="contract-call-address">
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
        <Col>
          <Row isTitle>{t('page.signTx.contractCall.operation')}</Row>
          <Row>
            <div className="relative flex items-center">
              <span
                className="overflow-ellipsis whitespace-nowrap overflow-hidden"
                title={requireData.call.func}
              >
                {requireData.call.func || '-'}
              </span>
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                title={
                  requireData.call.func
                    ? t('page.signTx.contractCall.operationABIDesc')
                    : t('page.signTx.contractCall.operationCantDecode')
                }
              >
                <img src={IconQuestionMark} className="w-12 ml-6" />
              </TooltipWithMagnetArrow>
            </div>
          </Row>
        </Col>
        {new BigNumber(requireData.payNativeTokenAmount).gt(0) && (
          <Col>
            <Row isTitle>
              {t('page.signTx.contractCall.payNativeToken', {
                symbol: requireData.nativeTokenSymbol,
              })}
            </Row>
            {
              <Row>
                {formatTokenAmount(
                  new BigNumber(requireData.payNativeTokenAmount)
                    .div(1e18)
                    .toFixed()
                )}{' '}
                {requireData.nativeTokenSymbol}
              </Row>
            }
          </Col>
        )}
        {requireData.unexpectedAddr && (
          <>
            <Col>
              <Row isTitle itemsCenter>
                {t('page.signTx.contractCall.suspectedReceiver')}
              </Row>
              <Row>
                <ViewMore
                  type="receiver"
                  data={{
                    title: t('page.signTx.contractCall.suspectedReceiver'),
                    address: requireData.unexpectedAddr!.address,
                    chain: requireData.unexpectedAddr!.chain,
                    eoa: requireData.unexpectedAddr!.eoa,
                    cex: requireData.unexpectedAddr!.cex,
                    contract: requireData.unexpectedAddr!.contract,
                    usd_value: requireData.unexpectedAddr!.usd_value,
                    hasTransfer: requireData.unexpectedAddr!.hasTransfer,
                    isTokenContract: requireData.unexpectedAddr!
                      .isTokenContract,
                    name: requireData.unexpectedAddr!.name,
                    onTransferWhitelist: requireData.unexpectedAddr!
                      .onTransferWhitelist,
                  }}
                >
                  <Values.Address
                    id="contract-call-receiver"
                    hasHover
                    address={requireData.unexpectedAddr!.address}
                    chain={chain}
                  />
                </ViewMore>
              </Row>
            </Col>
            <SubTable target="contract-call-receiver">
              <SubCol>
                <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
                <SubRow>
                  <Values.AddressMemo
                    address={requireData.unexpectedAddr!.address}
                  />
                </SubRow>
              </SubCol>
              {requireData.unexpectedAddr!.name && (
                <SubCol>
                  <SubRow isTitle>{t('page.signTx.addressTypeTitle')}</SubRow>
                  <SubRow>{requireData.unexpectedAddr!.name}</SubRow>
                </SubCol>
              )}
            </SubTable>
          </>
        )}
      </Table>
    </Wrapper>
  );
};

export default ContractCall;
