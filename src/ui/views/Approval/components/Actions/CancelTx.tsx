import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { Chain } from 'background/service/openapi';
import { Result } from '@debank/rabby-security-engine';
import { sortBy } from 'lodash';
import {
  ParsedActionData,
  CancelTxRequireData,
  getActionTypeText,
} from './utils';
import { useRabbyDispatch } from '@/ui/store';

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
      left: 12px;
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

const CancelTx = ({
  data,
  requireData,
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

  const pendingTxs = useMemo(() => {
    const txs: { type: string; gasPrice: number }[] = [];
    // TODO FIXME
    requireData.pendingTxs.forEach((group) => {
      let type = 'Unknown';
      if (group.action) {
        const data = group.action.actionData;
        type = getActionTypeText(data);
      }
      group.txs.forEach((tx) => {
        if ((tx.rawTx as any).isCancel) {
          txs.push({
            type: 'Cancel Pending Transaction',
            gasPrice: Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0),
          });
        } else {
          txs.push({
            type,
            gasPrice: Number(tx.rawTx.gasPrice || tx.rawTx.maxFeePerGas || 0),
          });
        }
      });
    });
    return sortBy(txs, 'gasPrice').reverse();
  }, [requireData]);

  return (
    <Wrapper>
      {requireData.pendingTxs.length > 0 && (
        <div className="container">
          <div className="internal-transaction">
            Pending transactions with nonce # {Number(data?.nonce)}
            <div className="bg"></div>
          </div>
          {pendingTxs.map((tx) => (
            <div className="tx-item flex justify-between">
              <span>{tx.type}</span>
              <span>{tx.gasPrice / 1e9} Gwei</span>
            </div>
          ))}
        </div>
      )}
    </Wrapper>
  );
};

export default CancelTx;
