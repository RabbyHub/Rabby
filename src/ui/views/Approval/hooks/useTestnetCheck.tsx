import { BigNumber } from 'bignumber.js';
import { SIGN_PERMISSION_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import { CHAINS_LIST } from '@debank/common';
import { useMemoizedFn, useRequest } from 'ahooks';
import { useEffect, useMemo } from 'react';
import { Button, Modal } from 'antd';
import styled from 'styled-components';
import React from 'react';
import { useRabbySelector } from '@/ui/store';
import { useTranslation } from 'react-i18next';

const Content = styled.div`
  text-align: center;
  .title {
    color: var(--r-neutral-title-1);
    text-align: center;
    font-size: 16px;
    font-weight: 500;
    line-height: 22px;
    margin-bottom: 28px;
  }
  .ant-btn {
    width: 172px;
    height: 44px;
  }
`;

export const useTestnetCheck = ({
  chainId,
  onOk,
}: {
  chainId?: string | number;
  onOk?: () => void;
}) => {
  const chain = useMemo(
    () =>
      chainId
        ? CHAINS_LIST.find((item) =>
            new BigNumber(item.network).isEqualTo(chainId)
          )
        : undefined,
    [chainId]
  );

  const isShowTestnet = useRabbySelector(
    (state) => state.preference.isShowTestnet
  );

  const handleOk = useMemoizedFn(() => {
    onOk?.();
  });

  const { t } = useTranslation();
  useEffect(() => {
    if (!isShowTestnet && chain && chain?.isTestnet) {
      const { destroy } = Modal.info({
        className: 'testnet-check-modal modal-support-darkmode',
        width: 360,
        centered: true,
        content: (
          <Content>
            <div className="title">
              {t('component.testnetCheckModal.title')}
            </div>
            <Button
              type="primary"
              onClick={() => {
                destroy();
                handleOk();
              }}
            >
              {t('global.ok')}
            </Button>
          </Content>
        ),
      });
      return () => {
        destroy();
      };
    }
  }, [isShowTestnet, chain?.isTestnet]);
};
