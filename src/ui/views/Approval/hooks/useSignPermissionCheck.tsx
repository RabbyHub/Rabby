import { BigNumber } from 'bignumber.js';
import { SIGN_PERMISSION_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import { CHAINS_LIST } from '@debank/common';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useEffect, useMemo } from 'react';
import { Button, Modal } from 'antd';
import styled from 'styled-components';
import React from 'react';

const Content = styled.div`
  text-align: center;
  .title {
    color: #13141a;
    text-align: center;
    font-size: 16px;
    font-weight: 500;
    line-height: 19px;
    margin-bottom: 33px;
  }
  .ant-btn {
    width: 172px;
    height: 44px;
    margin-bottom: 20px;
  }
  .disconnect {
    color: #3e495e;
    text-align: center;
    font-size: 13px;
    font-weight: 400;
    text-decoration-line: underline;
    cursor: pointer;
  }
`;

export const useSignPermissionCheck = ({
  origin,
  chainId,
  onDisconnect,
  onOk,
}: {
  origin?: string;
  chainId?: string | number;
  onOk?: () => void;
  onDisconnect?: () => void;
}) => {
  const wallet = useWallet();
  const chain = useMemo(
    () =>
      chainId
        ? CHAINS_LIST.find((item) =>
            new BigNumber(item.network).isEqualTo(chainId)
          )
        : undefined,
    [chainId]
  );

  const { data: connectedSite } = useRequest(
    () => {
      return origin
        ? wallet.getConnectedSite(origin)
        : Promise.resolve(undefined);
    },
    {
      refreshDeps: [origin],
    }
  );

  const handleOk = useMemoizedFn(() => {
    onOk?.();
  });

  const handleDisconnect = useMemoizedFn(async () => {
    if (origin) {
      await wallet.removeConnectedSite(origin);
    }
    onDisconnect?.();
  });

  useEffect(() => {
    if (
      connectedSite &&
      connectedSite.signPermission === SIGN_PERMISSION_TYPES.TESTNET &&
      chain &&
      !chain?.isTestnet
    ) {
      const { destroy } = Modal.info({
        className: 'sign-permission-check-modal',
        width: 360,
        centered: true,
        content: (
          <Content>
            <div className="title">
              You only allow this Dapp to sign on testnets
            </div>
            <Button
              type="primary"
              onClick={() => {
                destroy();
                handleOk();
              }}
            >
              OK
            </Button>
            <div className="footer">
              <span
                className="disconnect"
                onClick={() => {
                  destroy();
                  handleDisconnect();
                }}
              >
                Reconnect Dapp
              </span>
            </div>
          </Content>
        ),
      });
      return () => {
        destroy();
      };
    }
  }, [connectedSite, chain]);
};
