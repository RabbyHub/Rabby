import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { maxBy } from 'lodash';
import {
  ParsedActionData,
  CancelTxRequireData,
  getActionTypeText,
} from './utils';
import { useRabbyDispatch } from '@/ui/store';
import IconAlert from 'ui/assets/sign/tx/alert.svg';

const Wrapper = styled.div`
  .container {
    flex: 1;
    background: rgba(134, 151, 255, 0.1);
    border: 1px solid #8697ff;
    border-radius: 6px;
    padding: 12px;
    // margin-top: 14px;
    position: relative;
    .internal-transaction {
      padding: 0 5px;
      position: absolute;
      text-align: center;
      z-index: 1;
      color: #8697ff;
      font-size: 12px;
      line-height: 12px;
      top: -7px;
      left: 10px;
      .bg {
        position: absolute;
        bottom: 0;
        width: 100%;
        height: 6px;
        // background-color: #eaecfb;
        background: #ebedfa;
        z-index: -1;
      }
    }
    .tx-item {
      padding-bottom: 13px;
      margin-bottom: 13px;
      border-bottom: 1px solid #e0e3f1;
      span {
        font-weight: 500;
        font-size: 14px;
        line-height: 16px;
        &:nth-child(1) {
          color: #000;
        }
        &:nth-child(2) {
          color: #666;
        }
      }
      &:nth-last-child(1) {
        padding-bottom: 0;
        margin-bottom: 0;
        border: none;
      }
    }
  }
`;

const GasPriceTip = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 24px;
  font-weight: 500;
  font-size: 14px;
  line-height: 16px;
  color: #333333;
  margin-top: 15px;
`;

const CancelTx = ({
  data,
  requireData,
  raw,
}: {
  data: ParsedActionData['cancelTx'];
  requireData: CancelTxRequireData;
  chain: Chain;
  raw: Record<string, string | number>;
  engineResults: Result[];
  onChange(tx: Record<string, any>): void;
}) => {
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.securityEngine.init();
  }, []);

  const pendingTx = useMemo(() => {
    let tx: { type: string; gasPrice: number } | null = null;
    requireData.pendingTxs.forEach((group) => {
      let type = 'Unknown';
      if (group.action) {
        const data = group.action.actionData;
        type = getActionTypeText(data);
      }
      const target = maxBy(group.txs, (item) =>
        Number(item.rawTx.gasPrice || item.rawTx.maxFeePerGas || 0)
      );
      if (target) {
        const res = {
          type,
          gasPrice: Number(
            target.rawTx.gasPrice || target.rawTx.maxFeePerGas || 0
          ),
        };
        if (tx && res.gasPrice > tx.gasPrice) {
          tx = res;
        } else {
          tx = res;
        }
      }
    });
    return tx as { type: string; gasPrice: number } | null;
  }, [requireData]);

  const canCancel = useMemo(() => {
    if (!pendingTx) return true;
    const currentGasPrice = Number(raw.gasPrice || raw.maxFeePerGas || 0);
    return currentGasPrice > pendingTx.gasPrice;
  }, [raw, pendingTx]);

  return (
    <Wrapper>
      {requireData.pendingTxs.length > 0 && (
        <>
          <div className="container">
            <div className="internal-transaction">
              Transaction to be canceled
              <div className="bg"></div>
            </div>
            {pendingTx && (
              <div className="tx-item flex justify-between">
                <span>{pendingTx.type}</span>
                <span>{pendingTx.gasPrice / 1e9} Gwei</span>
              </div>
            )}
          </div>
          {pendingTx && !canCancel && (
            <GasPriceTip>
              <img src={IconAlert} className="w-[15px] mr-10" />
              Set current gas price more than {pendingTx.gasPrice / 1e9} Gwei to
              cancel the pending transaction
            </GasPriceTip>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default CancelTx;
