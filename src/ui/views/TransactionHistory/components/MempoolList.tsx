import { useRequest } from 'ahooks';
import React from 'react';
import styled from 'styled-components';
import IconChecked from 'ui/assets/signature-record/checked.svg';
import { useWallet } from 'ui/utils';

const Wrapper = styled.div`
  min-width: 168px;
  .title {
    color: var(--r-neutral-title-1, #192945);
    font-size: 13px;
    font-weight: 500;
  }
  .btn {
    display: inline-flex;
    padding: 4px 16px;
    justify-content: center;
    align-items: center;
    gap: 10px;

    border-radius: 2px;
    background: var(--r-blue-light-1, #eef1ff);

    color: var(--r-blue-default, #7084ff);
    font-size: 13px;
    font-weight: 500;

    cursor: pointer;

    margin-top: 16px;
  }

  .mempool-list {
    margin-top: 14px;
  }

  .mempool-item {
    display: flex;
    align-items: center;
    gap: 6px;

    color: var(--r-green-default, #2abb7f);
    font-size: 13px;
    font-weight: 500;

    &:not(:last-child) {
      margin-bottom: 12px;
    }
  }
`;

export const MempoolList = ({
  reqId,
  hash,
  onReBroadcast,
}: {
  reqId?: string;
  hash?: string;
  onReBroadcast?(reqId: string): void;
}) => {
  const wallet = useWallet();
  const { data } = useRequest(
    async () => {
      if (!hash) {
        return undefined;
      }
      return wallet.openapi.mempoolChecks(hash);
    },
    {
      refreshDeps: [hash],
    }
  );

  const isEmpty = !data || !data.length;

  return (
    <Wrapper>
      {isEmpty ? (
        <>
          <div className="title">Not found in any node</div>
          {reqId ? (
            <div
              className="btn"
              onClick={() => {
                onReBroadcast?.(reqId);
              }}
            >
              Re-broadcast
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="title">Found in the below memopools</div>
          <div className="mempool-list">
            {data?.map((item) => {
              return (
                <div className="mempool-item">
                  <img src={IconChecked} alt="" />
                  {item.rpc}
                </div>
              );
            })}
          </div>
          {reqId ? (
            <div
              className="btn"
              onClick={() => {
                onReBroadcast?.(reqId);
              }}
            >
              Re-broadcast
            </div>
          ) : null}
        </>
      )}
    </Wrapper>
  );
};
