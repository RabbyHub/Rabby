import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Input } from 'antd';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { Chain, TokenItem } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { ApproveTokenRequireData, ParsedActionData } from './utils';
import { ellipsisTokenSymbol } from 'ui/utils/token';
import { ellipsisOverflowedText } from '@/ui/utils';
import { getCustomTxParamsData } from 'ui/utils/transaction';
import { formatAmount, formatUsdValue } from '@/ui/utils/number';
import { useRabbyDispatch } from '@/ui/store';
import { Popup } from 'ui/component';
import { Table, Col, Row } from './components/Table';
import LogoWithText from './components/LogoWithText';
import * as Values from './components/Values';
import ViewMore from './components/ViewMore';
import { SecurityListItem } from './components/SecurityListItem';
import { ProtocolListItem } from './components/ProtocolListItem';

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
  visible: boolean;
}

const ApproveAmountModal = ({
  balance,
  amount,
  token,
  visible,
  onChange,
}: ApproveAmountModalProps) => {
  const inputRef = useRef<Input>(null);
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

  useEffect(() => {
    console.log('visible', inputRef.current);
    if (visible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [visible]);

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
          ref={inputRef}
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    dispatch.securityEngine.init();
  }, []);

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>Approve token</Row>
          <Row>
            <LogoWithText
              logo={actionData.token.logo_url}
              text={ellipsisTokenSymbol(actionData.token.symbol)}
              logoRadius="100%"
            />
          </Row>
        </Col>
        <Col>
          <Row isTitle>Amount</Row>
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
        <Col>
          <Row isTitle>Approve to</Row>
          <Row>
            <div>
              <Values.Address address={actionData.spender} chain={chain} />
            </div>
            <ul className="desc-list">
              <ProtocolListItem protocol={requireData.protocol} />

              <SecurityListItem
                id="1022"
                engineResult={engineResultMap['1022']}
                dangerText="EOA address"
              />

              <SecurityListItem
                id="1025"
                engineResult={engineResultMap['1025']}
                warningText="Never Interacted before"
                safeText="Interacted before"
              />

              <SecurityListItem
                id="1023"
                engineResult={engineResultMap['1023']}
                dangerText="Risk exposure <= $10,000"
                warningText="Risk exposure <= $100,000"
              />

              <SecurityListItem
                id="1024"
                engineResult={engineResultMap['1024']}
                warningText="Deployed time < 3 days"
              />

              <SecurityListItem
                id="1029"
                engineResult={engineResultMap['1029']}
                dangerText="Flagged by Rabby"
              />

              <li>
                <ViewMore
                  type="spender"
                  data={{
                    ...requireData,
                    spender: actionData.spender,
                    chain,
                  }}
                />
              </li>
            </ul>
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
          visible={editApproveModalVisible}
        />
      </Popup>
    </Wrapper>
  );
};

export default TokenApprove;
