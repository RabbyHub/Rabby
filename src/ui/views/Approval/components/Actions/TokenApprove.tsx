import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input } from 'antd';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain, TokenItem } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveTokenRequireData, ParsedActionData } from './utils';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { getTimeSpan } from 'ui/utils/time';
import { isSameAddress, ellipsisOverflowedText } from '@/ui/utils';
import { getCustomTxParamsData } from 'ui/utils/transaction';
import { formatAmount, formatUsdValue } from '@/ui/utils/number';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Popup } from 'ui/component';
import { Table, Col, Row } from './components/Table';
import AddressMemo from './components/AddressMemo';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
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
`;

interface ApproveAmountModalProps {
  amount: number | string;
  balance: string | undefined | null;
  token: TokenItem;
  onChange(value: string): void;
}

const ApproveAmountModal = ({
  balance,
  amount,
  token,
  onChange,
}: ApproveAmountModalProps) => {
  const [customAmount, setCustomAmount] = useState(
    new BigNumber(amount).toFixed()
  );
  const [tokenPrice, setTokenPrice] = useState(
    new BigNumber(amount).times(token.price).toNumber()
  );
  const [canSubmit, setCanSubmit] = useState(false);
  const handleSubmit = () => {
    onChange(customAmount);
  };
  const handleChange = (value: string) => {
    if (/^\d*(\.\d*)?$/.test(value)) {
      setCustomAmount(value);
    }
  };

  useEffect(() => {
    if (
      !customAmount ||
      Number(customAmount) <= 0 ||
      Number.isNaN(Number(customAmount))
    ) {
      setCanSubmit(false);
    } else {
      setCanSubmit(true);
    }
    setTokenPrice(Number(customAmount || 0) * token.price);
  }, [customAmount]);

  return (
    <Form onFinish={handleSubmit}>
      <Form.Item>
        <Input
          value={customAmount}
          onChange={(e) => handleChange(e.target.value)}
          bordered={false}
          addonAfter={
            <span title={token.symbol}>
              {ellipsisTokenSymbol(token.symbol, 4)}
            </span>
          }
          autoFocus
        />
      </Form.Item>
      <div className="approve-amount-footer overflow-hidden gap-[8px]">
        <span
          className="est-approve-price truncate"
          title={formatUsdValue(new BigNumber(tokenPrice).toFixed(2))}
        >
          ≈
          {ellipsisOverflowedText(
            formatUsdValue(new BigNumber(tokenPrice).toFixed()),
            18,
            true
          )}
        </span>
        {balance && (
          <span
            className="token-approve-balance truncate"
            title={formatAmount(balance)}
            onClick={() => {
              setCustomAmount(balance);
            }}
          >
            Balance: {formatAmount(new BigNumber(balance).toFixed(4))}
          </span>
        )}
      </div>
      <div className="flex justify-center mt-32 popup-footer">
        <Button
          type="primary"
          className="w-[200px]"
          size="large"
          htmlType="submit"
          disabled={!canSubmit}
        >
          Confirm
        </Button>
      </div>
    </Form>
  );
};

const TokenApprove = ({
  data,
  requireData,
  chain,
  engineResults,
  raw,
  onChange,
}: {
  data: ParsedActionData['approveToken'];
  requireData: ApproveTokenRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const actionData = data!;
  const [editApproveModalVisible, setEditApproveModalVisible] = useState(false);
  const dispatch = useRabbyDispatch();
  const { userData, rules, processedRules } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));

  const spenderInWhitelist = useMemo(() => {
    return !!userData.contractWhitelist.find((contract) => {
      return (
        isSameAddress(contract.address, actionData.spender) &&
        contract.chainId === chain.serverId
      );
    });
  }, [userData, requireData, chain]);
  const spenderInBlacklist = useMemo(() => {
    return !!userData.contractBlacklist.find((contract) => {
      return isSameAddress(contract.address, actionData.spender);
    });
  }, [userData, requireData, chain]);

  const timeSpan = useMemo(() => {
    const bornAt = requireData.bornAt;

    const { d, h, m } = getTimeSpan(Math.floor(Date.now() / 1000) - bornAt);
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

  const engineResultMap = useMemo(() => {
    const map: Record<string, Result> = {};
    engineResults.forEach((item) => {
      map[item.id] = item;
    });
    return map;
  }, [engineResults]);

  const tokenBalance = useMemo(() => {
    return new BigNumber(requireData.token.raw_amount || '0')
      .div(10 ** requireData.token.decimals)
      .toFixed();
  }, [requireData]);
  const approveAmount = useMemo(() => {
    return new BigNumber(actionData.token.raw_amount || '0')
      .div(10 ** actionData.token.decimals)
      .toFixed();
  }, [actionData]);

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

  const handleClickTokenBalance = () => {
    if (new BigNumber(approveAmount).gt(tokenBalance)) {
      handleApproveAmountChange(tokenBalance);
    }
  };

  const handleApproveAmountChange = (value: string) => {
    const result = new BigNumber(value).isGreaterThan(Number.MAX_SAFE_INTEGER)
      ? String(Number.MAX_SAFE_INTEGER)
      : value;
    const data = getCustomTxParamsData(raw.data, {
      customPermissionAmount: result,
      decimals: actionData.token.decimals,
    });
    onChange({
      data,
    });
  };

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve Token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={ellipsisTokenSymbol(actionData.token.symbol)}
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>Approve Amount</Row>
          <Row>
            <div className="flex justify-between pr-10">
              <Values.TokenAmount value={actionData.token.amount} />
              <span
                className="text-blue-light text-12 font-medium cursor-pointer"
                onClick={() => setEditApproveModalVisible(true)}
              >
                Edit
              </span>
            </div>
            <ul className="desc-list">
              <li>
                My balance{' '}
                <span
                  className="underline cursor-pointer"
                  onClick={handleClickTokenBalance}
                >
                  {formatAmount(tokenBalance)}
                </span>{' '}
                {ellipsisTokenSymbol(actionData.token.symbol)}
              </li>
            </ul>
          </Row>
        </Col>
      </Table>
      <div className="header">
        <div className="left">
          <Values.Address
            address={actionData.spender}
            chain={chain}
            iconWidth="16px"
          />
        </div>
        <div className="right">approve to</div>
      </div>
      <Table>
        <Col>
          <Row isTitle>Protocol</Row>
          <Row>
            <Values.Protocol value={requireData.protocol} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>Type</Row>
          <Row>
            {requireData.isEOA ? 'EOA' : 'Contract'}
            {engineResultMap['1022'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1022')
                    ? 'proceed'
                    : engineResultMap['1022'].level
                }
                onClick={() => handleClickRule('1022')}
              />
            )}
            {engineResultMap['1029'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1029')
                    ? 'proceed'
                    : engineResultMap['1029'].level
                }
                onClick={() => handleClickRule('1029')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>{requireData.isEOA ? 'First on-chain' : 'Deployed'}</Row>
          <Row>
            {timeSpan}
            {engineResultMap['1024'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1024')
                    ? 'proceed'
                    : engineResultMap['1024'].level
                }
                onClick={() => handleClickRule('1024')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row
            isTitle
            tip="The total risk exposure approved to this spender address"
          >
            Risk exposure
          </Row>
          <Row>
            <Values.USDValue value={requireData.riskExposure} />
            {engineResultMap['1023'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1023')
                    ? 'proceed'
                    : engineResultMap['1023'].level
                }
                onClick={() => handleClickRule('1023')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Popularity</Row>
          <Row>
            {requireData.rank ? `No.${requireData.rank} on ${chain.name}` : '-'}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Interacted before</Row>
          <Row>
            <Values.Boolean value={requireData.hasInteraction} />
            {engineResultMap['1025'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1025')
                    ? 'proceed'
                    : engineResultMap['1025'].level
                }
                onClick={() => handleClickRule('1025')}
              />
            )}
          </Row>
        </Col>
        <Col>
          <Row isTitle>Address note</Row>
          <Row>
            <AddressMemo address={actionData.spender} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>My mark</Row>
          <Row>
            <Values.AddressMark
              onWhitelist={spenderInWhitelist}
              onBlacklist={spenderInBlacklist}
              address={actionData.spender}
              chain={chain}
              isContract
              onChange={() => dispatch.securityEngine.init()}
            />
            {engineResultMap['1026'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1026')
                    ? 'proceed'
                    : engineResultMap['1026'].level
                }
                onClick={() => handleClickRule('1026')}
              />
            )}
            {engineResultMap['1027'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1027')
                    ? 'proceed'
                    : engineResultMap['1027'].level
                }
                onClick={() => handleClickRule('1027')}
              />
            )}
            {engineResultMap['1028'] && (
              <SecurityLevelTagNoText
                level={
                  processedRules.includes('1028')
                    ? 'proceed'
                    : engineResultMap['1028'].level
                }
                onClick={() => handleClickRule('1028')}
              />
            )}
          </Row>
        </Col>
      </Table>
      <Popup
        visible={editApproveModalVisible}
        className="edit-approve-amount-modal"
        height={280}
        title="Amount"
        onCancel={() => setEditApproveModalVisible(false)}
        destroyOnClose
      >
        <ApproveAmountModal
          balance={tokenBalance}
          amount={approveAmount}
          token={actionData.token}
          onChange={handleApproveAmountChange}
        />
      </Popup>
    </Wrapper>
  );
};

export default TokenApprove;
