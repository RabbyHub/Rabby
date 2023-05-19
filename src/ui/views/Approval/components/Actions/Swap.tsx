import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Button, Form, Input, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { Popup } from 'ui/component';
import { BigNumber } from 'bignumber.js';
import styled from 'styled-components';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import userDataDrawer from './components/UserListDrawer';
import { ParsedActionData, SwapRequireData, useUserData } from './utils';
import { formatTokenAmount, formatUsdValue } from 'ui/utils/number';
import { ellipsis } from 'ui/utils/address';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { Chain } from 'background/service/openapi';
import IconRank from 'ui/assets/sign/contract/rank.svg';
import { Result } from '@debank/rabby-security-engine';
import SecurityLevelTagNoText from '../SecurityEngine/SecurityLevelTagNoText';
import { isSameAddress, useAlias, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import IconEdit from 'ui/assets/editpen.svg';
import RuleDrawer from '../SecurityEngine/RuleDrawer';
import { Level, RuleConfig } from '@debank/rabby-security-engine/dist/rules';

const Wrapper = styled.div`
  .header {
    margin-top: 15px;
  }
  .icon-edit-alias {
    width: 13px;
    height: 13px;
    cursor: pointer;
  }
`;

const Swap = ({
  data,
  requireData,
  chain,
  engineResults,
}: {
  data: ParsedActionData['swap'];
  requireData: SwapRequireData;
  chain: Chain;
  engineResults: Result[];
}) => {
  const {
    payToken,
    receiveToken,
    slippageTolerance,
    usdValueDiff,
    usdValuePercentage,
    minReceive,
    receiver,
  } = data!;

  const { userData, rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const [receiverAlias, updateReceiverAlias] = useAlias(receiver);
  const [contractAlias, updateContractAlias] = useAlias(requireData.id);
  const inputRef = useRef<Input>(null);
  const [form] = useForm();

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const receiverInWhitelist = useMemo(() => {
    return userData.addressWhitelist.includes(receiver.toLowerCase());
  }, [userData, receiver]);
  const receiverInBlacklist = useMemo(() => {
    return userData.addressBlacklist.includes(receiver.toLowerCase());
  }, [userData, receiver]);

  const contractInWhitelist = useMemo(() => {
    return !!userData.contractWhitelist.find((contract) => {
      return (
        isSameAddress(contract.address, requireData.id) &&
        contract.chainId === chain.serverId
      );
    });
  }, [userData, requireData, chain]);
  const contractInBlacklist = useMemo(() => {
    return !!userData.contractBlacklist.find((contract) => {
      return isSameAddress(contract.address, requireData.id);
    });
  }, [userData, requireData, chain]);

  const hasReceiver = useMemo(() => {
    // return isSameAddress(receiver, requireData.sender);
    return !isSameAddress(receiver, requireData.sender);
  }, [requireData, receiver]);

  const handleEditContractMark = () => {
    userDataDrawer({
      address: requireData.id,
      onWhitelist: contractInWhitelist,
      onBlacklist: contractInBlacklist,
      async onChange({ onWhitelist, onBlacklist }) {
        const contract = {
          address: requireData.id,
          chainId: chain.serverId,
        };
        if (onWhitelist && !contractInWhitelist) {
          await wallet.addContractWhitelist(contract);
        }
        if (onBlacklist && !contractInBlacklist) {
          await wallet.addContractBlacklist(contract);
        }
        if (
          !onBlacklist &&
          !onWhitelist &&
          (contractInBlacklist || contractInWhitelist)
        ) {
          await wallet.removeContractBlacklist(contract);
          await wallet.removeContractWhitelist(contract);
        }
        dispatch.securityEngine.init();
      },
    });
  };

  const updateAddressMemo = (
    alias: string | undefined,
    update: (memo: string) => void
  ) => {
    form.setFieldsValue({
      memo: alias,
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
    const { destroy } = Popup.info({
      title: 'Edit address note',
      height: 215,
      content: (
        <div className="pt-[4px]">
          <Form
            form={form}
            onFinish={async () => {
              form
                .validateFields()
                .then((values) => {
                  return update(values.memo);
                })
                .then(() => {
                  destroy();
                });
            }}
            initialValues={{
              memo: alias,
            }}
          >
            <Form.Item
              name="memo"
              className="h-[80px] mb-0"
              rules={[{ required: true, message: 'Please input address note' }]}
            >
              <Input
                ref={inputRef}
                className="popup-input h-[48px]"
                size="large"
                placeholder="Please input address note"
                autoFocus
                allowClear
                spellCheck={false}
                autoComplete="off"
                maxLength={50}
              ></Input>
            </Form.Item>
            <div className="text-center">
              <Button
                type="primary"
                size="large"
                className="w-[200px]"
                htmlType="submit"
              >
                Confirm
              </Button>
            </div>
          </Form>
        </div>
      ),
    });
  };

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

  const timeSpan = useMemo(() => {
    const { d, h, m } = getTimeSpan(
      Math.floor(Date.now() / 1000) - requireData.bornAt
    );
    if (d > 0) {
      return `${d} Day${d > 1 ? 's' : ''} ago`;
    }
    if (h > 0) {
      return `${h} Hour${h > 1 ? 's' : ''} ago`;
    }
    if (m > 1) {
      return `${m} Minutes ago`;
    }
    return '1 Minute ago';
  }, [requireData]);

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Pay Token</Row>
          <Row>
            <LogoWithText
              logo={payToken.logo_url}
              text={`${formatTokenAmount(
                payToken.amount
              )} ${ellipsisTokenSymbol(payToken.symbol)}`}
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(payToken.amount).times(payToken.price).toFixed()
                )}
                @{formatUsdValue(payToken.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Receive Token</Row>
          <Row>
            <LogoWithText
              logo={receiveToken.logo_url}
              text={`${formatTokenAmount(
                receiveToken.amount
              )} ${ellipsisTokenSymbol(receiveToken.symbol)}`}
            />
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(receiveToken.amount)
                    .times(receiveToken.price)
                    .toFixed()
                )}
                @{formatUsdValue(receiveToken.price)}
              </li>
              <li>
                Value diff {(usdValuePercentage * 100).toFixed(2)}%(
                {formatUsdValue(usdValueDiff)})
                {engineResultMap['1012'] && (
                  <SecurityLevelTagNoText
                    level={
                      processedRules.includes('1012')
                        ? 'proceed'
                        : engineResultMap['1012'].level
                    }
                    onClick={() => handleClickRule('1012')}
                  />
                )}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Minimum Received</Row>
          <Row>
            <div>{`${formatTokenAmount(
              minReceive.amount
            )} ${ellipsisTokenSymbol(minReceive.symbol)}`}</div>
            <ul className="desc-list">
              <li>
                {formatUsdValue(
                  new BigNumber(minReceive.amount)
                    .times(minReceive.price)
                    .toFixed()
                )}
                @{formatUsdValue(minReceive.price)}
              </li>
            </ul>
          </Row>
        </Col>
        <Col>
          <Row isTitle>Slippage tolerance</Row>
          <Row>
            <div>{(slippageTolerance * 100).toFixed(2)}%</div>
            {engineResultMap['1011'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1011')
                    ? 'proceed'
                    : engineResultMap['1011'].level
                }
                onClick={() => handleClickRule('1011')}
              />
            )}
          </Row>
        </Col>
        {hasReceiver && (
          <Col>
            <Row isTitle>Receiver</Row>
            <Row>
              {ellipsis(receiver)}
              <ul className="desc-list">
                <li>
                  not your current address{' '}
                  {engineResultMap['1010'] && (
                    <SecurityLevelTagNoText
                      level={
                        processedRules.includes('1010')
                          ? 'proceed'
                          : engineResultMap['1010'].level
                      }
                      onClick={() => handleClickRule('1010')}
                    />
                  )}
                </li>
                <li className="flex">
                  <span className="mr-2">{receiverAlias || ''}</span>
                  <img
                    src={IconEdit}
                    className="icon-edit-alias icon"
                    onClick={() =>
                      updateAddressMemo(receiverAlias, updateReceiverAlias)
                    }
                  />
                </li>
                <li className="flex">
                  <span className="mr-2">
                    {receiverInBlacklist && 'Blocked'}
                    {receiverInWhitelist && 'Trusted'}
                    {!receiverInBlacklist && !receiverInWhitelist && 'No mark'}
                  </span>
                  <img
                    src={IconEdit}
                    className="icon-edit-alias icon"
                    onClick={() =>
                      updateAddressMemo(contractAlias, updateContractAlias)
                    }
                  />
                </li>
              </ul>
            </Row>
          </Col>
        )}
      </Table>
      <div className="header">
        <div className="left">{ellipsis(requireData.id)}</div>
        <div className="right">contract</div>
      </div>
      <Table>
        {requireData.protocol && (
          <Col>
            <Row isTitle>Protocol</Row>
            <Row>
              <LogoWithText
                logo={requireData.protocol.logo_url}
                text={requireData.protocol.name}
              />
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Deployed</Row>
          <Row>{timeSpan}</Row>
        </Col>
        {requireData.rank && (
          <Col>
            <Row isTitle>Popularity</Row>
            <Row>
              <div className="flex">
                No.{requireData.rank} on {chain.name}
              </div>
            </Row>
          </Col>
        )}
        <Col>
          <Row isTitle>Interacted before</Row>
          <Row>{requireData.hasInteraction ? 'Yes' : 'No'}</Row>
        </Col>
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <div className="flex">
              <span className="mr-6">{contractAlias || '-'}</span>
              <img
                src={IconEdit}
                className="icon-edit-alias icon"
                onClick={() =>
                  updateAddressMemo(contractAlias, updateContractAlias)
                }
              />
            </div>
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <div className="flex">
              <span className="mr-6">
                {contractInBlacklist && 'Blocked'}
                {contractInWhitelist && 'Trusted'}
                {!contractInBlacklist && !contractInWhitelist && 'No mark'}
              </span>
              <img
                src={IconEdit}
                className="icon-edit-alias icon"
                onClick={handleEditContractMark}
              />
            </div>
            {engineResultMap['1014'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1014')
                    ? 'proceed'
                    : engineResultMap['1014'].level
                }
                onClick={() => handleClickRule('1014')}
              />
            )}
            {engineResultMap['1015'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1015')
                    ? 'proceed'
                    : engineResultMap['1015'].level
                }
                onClick={() => handleClickRule('1015')}
              />
            )}
          </Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default Swap;
