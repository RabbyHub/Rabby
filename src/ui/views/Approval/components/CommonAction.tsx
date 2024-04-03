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

  React.useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

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
          <Col>
            <Row className="w-[100px]" isTitle>
              {t('page.signTx.common.interactContract')}
            </Row>
            <Row>
              <div>
                <Values.Address address={requireData.id} chain={chain} />
              </div>
              <ul className="desc-list">
                <ProtocolListItem protocol={requireData.protocol} />
                <li>
                  <Values.Interacted value={requireData.hasInteraction} />
                </li>

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
                      hasInteraction: requireData.hasInteraction,
                      bornAt: requireData.bornAt,
                      protocol: requireData.protocol,
                      rank: requireData.rank,
                      address: requireData.id,
                      chain,
                    }}
                  />
                </li>
              </ul>
            </Row>
          </Col>
        ) : null}
        <Col>
          <Row className="w-[100px]" isTitle>
            {t('page.signTx.common.description')}
          </Row>
          <Row className="flex flex-row items-center gap-x-4">
            <span>{actionData.desc}</span>
            {/* <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[260px]"
              title={descTip}
            >
              {actionData.is_asset_changed ||
              actionData.is_involving_privacy ? (
                <img src={Warning2SVG} />
              ) : null}
              {!actionData.is_asset_changed &&
              !actionData.is_involving_privacy ? (
                <img src={CertifiedSVG} />
              ) : null}
            </TooltipWithMagnetArrow> */}
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
          <Col>
            <Row isTitle className="w-[100px]">
              {t('page.signTx.swap.receiver')}
            </Row>
            <Row>
              <Values.Address address={actionData.receiver} chain={chain} />
              <ul className="desc-list">
                <li>
                  <Values.AddressMemo address={actionData.receiver} />
                </li>
                <SecurityListItem
                  engineResult={engineResultMap['1139']}
                  id="1139"
                  dangerText={t('page.signTx.swap.unknownAddress')}
                  defaultText={
                    <Values.KnownAddress address={actionData.receiver} />
                  }
                />
                <li>
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
                  />
                </li>
              </ul>
            </Row>
          </Col>
        )}
        {!hasReceiver && !actionData.receiver && addressInfo && (
          <Col>
            <Row isTitle className="w-[100px]">
              {t('page.signTx.contractCall.suspectedReceiver')}
            </Row>
            <Row>
              <div>
                <Values.Address address={addressInfo.address} chain={chain} />
                <ul className="desc-list">
                  <li>
                    <Values.AddressMemo address={addressInfo.address} />
                  </li>
                  {addressInfo.name && <li>{addressInfo.name}</li>}
                  <li>
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
                    />
                  </li>
                </ul>
              </div>
            </Row>
          </Col>
        )}
      </Table>
    </div>
  );
};
