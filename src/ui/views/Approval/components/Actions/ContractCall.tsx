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

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signTx.interactContract')}</Row>
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
        <Col>
          <Row isTitle>{t('page.signTx.contractCall.operation')}</Row>
          <Row>
            <div className="relative flex items-center">
              {requireData.call.func || '-'}
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
      </Table>
    </Wrapper>
  );
};

export default ContractCall;
