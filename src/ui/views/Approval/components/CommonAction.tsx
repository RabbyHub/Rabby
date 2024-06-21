import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import BigNumber from 'bignumber.js';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { isSameAddress } from '@/ui/utils';
import { ProtocolListItem } from './Actions/components/ProtocolListItem';
import { SecurityListItem } from './Actions/components/SecurityListItem';
import ViewMore from './Actions/components/ViewMore';
import { ContractRequireData } from './TypedDataActions/utils';
import { ContractCallRequireData } from './Actions/utils';
import { formatTokenAmount } from 'ui/utils/number';
import { Col, Row, Table } from './Actions/components/Table';
import * as Values from './Actions/components/Values';
import { SubTable, SubCol, SubRow } from './Actions/components/SubTable';

type CommonActions = {
  title: string;
  desc: string;
  is_asset_changed: boolean;
  is_involving_privacy: boolean;
  receiver?: string;
  from?: string;
};

export const CommonAction = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: CommonActions;
  requireData?: ContractRequireData | ContractCallRequireData; // ContractRequireData for signTypedData, ContractCallRequireData for signTransaction
  chain?: Chain;
  engineResults: Result[];
}) => {
  const { t } = useTranslation();
  const actionData = data!;
  const dispatch = useRabbyDispatch();
  const { contractWhitelist } = useRabbySelector((state) => {
    return state.securityEngine.userData;
  });

  const isInWhitelist = useMemo(() => {
    return contractWhitelist.some(
      (item) =>
        item.chainId === chain?.serverId &&
        isSameAddress(item.address, requireData?.id ?? '')
    );
  }, [contractWhitelist, requireData]);

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const addressInfo = requireData
    ? (requireData as ContractCallRequireData).unexpectedAddr
    : undefined;

  const hasReceiver = useMemo(() => {
    if (!actionData.receiver || !actionData.from) return false;
    return !isSameAddress(actionData.receiver, actionData.from);
  }, [actionData]);

  return (
    <div className="relative">
      <Table>
        {requireData && chain ? (
          <>
            <Col>
              <Row className="w-[100px]" isTitle itemsCenter>
                {t('page.signTx.common.interactContract')}
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
                    id="common-action-address"
                    hasHover
                    address={requireData.id}
                    chain={chain}
                  />
                </ViewMore>
              </Row>
            </Col>
            <SubTable target="common-action-address">
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
          </>
        ) : null}
        <Col>
          <Row className="w-[100px]" isTitle>
            {t('page.signTx.common.description')}
          </Row>
          <Row className="flex flex-row items-center gap-x-4" wrap>
            {actionData.desc}
          </Row>
        </Col>
        {(requireData as ContractCallRequireData)?.payNativeTokenAmount &&
          new BigNumber(
            (requireData as ContractCallRequireData).payNativeTokenAmount
          ).gt(0) && (
            <Col>
              <Row isTitle className="w-[100px]">
                {t('page.signTx.contractCall.payNativeToken', {
                  symbol: (requireData as ContractCallRequireData)
                    .nativeTokenSymbol,
                })}
              </Row>
              {
                <Row>
                  {formatTokenAmount(
                    new BigNumber(
                      (requireData as ContractCallRequireData).payNativeTokenAmount
                    )
                      .div(1e18)
                      .toFixed()
                  )}{' '}
                  {(requireData as ContractCallRequireData).nativeTokenSymbol}
                </Row>
              }
            </Col>
          )}
        {hasReceiver && actionData.receiver && addressInfo && (
          <>
            <Col>
              <Row isTitle className="w-[100px]" itemsCenter>
                {t('page.signTx.swap.receiver')}
              </Row>
              <Row>
                <ViewMore
                  type="receiver"
                  data={{
                    title: t('page.signTx.contractCall.receiver'),
                    address: addressInfo.address,
                    chain: addressInfo.chain,
                    eoa: addressInfo.eoa,
                    cex: addressInfo.cex,
                    contract: addressInfo.contract,
                    usd_value: addressInfo.usd_value,
                    hasTransfer: addressInfo.hasTransfer,
                    isTokenContract: addressInfo.isTokenContract,
                    name: addressInfo.name,
                    onTransferWhitelist: addressInfo.onTransferWhitelist,
                  }}
                >
                  <Values.Address
                    id="common-action-receiver"
                    hasHover
                    address={actionData.receiver}
                    chain={chain}
                  />
                </ViewMore>
              </Row>
            </Col>
            <SubTable target="common-action-receiver">
              <SubCol>
                <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
                <SubRow>
                  <Values.AddressMemo address={actionData.receiver} />
                </SubRow>
              </SubCol>

              <SecurityListItem
                engineResult={engineResultMap['1139']}
                id="1139"
                dangerText={t('page.signTx.swap.unknownAddress')}
                defaultText={
                  <Values.KnownAddress address={actionData.receiver} />
                }
              />
            </SubTable>
          </>
        )}
        {!hasReceiver && !actionData.receiver && addressInfo && (
          <>
            <Col>
              <Row isTitle className="w-[100px]" itemsCenter>
                {t('page.signTx.contractCall.suspectedReceiver')}
              </Row>
              <Row>
                <ViewMore
                  type="receiver"
                  data={{
                    title: t('page.signTx.contractCall.suspectedReceiver'),
                    address: addressInfo.address,
                    chain: addressInfo.chain,
                    eoa: addressInfo.eoa,
                    cex: addressInfo.cex,
                    contract: addressInfo.contract,
                    usd_value: addressInfo.usd_value,
                    hasTransfer: addressInfo.hasTransfer,
                    isTokenContract: addressInfo.isTokenContract,
                    name: addressInfo.name,
                    onTransferWhitelist: addressInfo.onTransferWhitelist,
                  }}
                >
                  <Values.Address
                    id="common-action-expect-receiver"
                    hasHover
                    address={addressInfo.address}
                    chain={chain}
                  />
                </ViewMore>
              </Row>
            </Col>
            <SubTable target="common-action-expect-receiver">
              <SubCol>
                <SubRow isTitle>{t('page.signTx.addressNote')}</SubRow>
                <SubRow>
                  <Values.AddressMemo address={addressInfo.address} />
                </SubRow>
              </SubCol>

              {addressInfo.name && (
                <SubCol>
                  <SubRow> </SubRow>
                  <SubRow>{addressInfo.name}</SubRow>
                </SubCol>
              )}
            </SubTable>
          </>
        )}
      </Table>
    </div>
  );
};
