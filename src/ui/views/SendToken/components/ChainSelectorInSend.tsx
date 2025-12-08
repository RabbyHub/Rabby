/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, {
  InsHTMLAttributes,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import clsx from 'clsx';
import { CHAINS_ENUM } from '@debank/common';

import { useState } from 'react';
import { SelectChainListProps } from '@/ui/component/ChainSelector/components/SelectChainList';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import styled, { createGlobalStyle } from 'styled-components';
import { findChain } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { DrawerProps, Modal, Skeleton } from 'antd';
import { TDisableCheckChainFn } from '@/ui/component/ChainSelector/components/SelectChainItem';
import { RiskWarningTitle } from '@/ui/component/RiskWarningTitle';

const ChainGlobalStyle = createGlobalStyle`
  .chain-selector-disable-item-tips {
    .ant-modal-body {
      background: var(--r-neutral-bg1, #fff);
      padding-top: 24px !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      padding-bottom: 20px !important;
    }
    .ant-modal-confirm-content {
      margin-top: 0 !important;
      padding: 0 !important;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      color: var(--r-neutral-title1, #192945);
    }
    .ant-modal-confirm-btns {
      margin-top: 35px !important;
      .ant-btn {
        font-size: 13px !important;
        font-weight: 500;
      }
      .ant-btn-ghost {
        border-color: var(--r-blue-default);
        color: var(--r-blue-default);
        &:hover {
          background: var(--r-blue-light1, #eef1ff) !important;
        }
      }
    }
  }
`;

interface ChainSelectorProps {
  value?: CHAINS_ENUM;
  onChange?(value: CHAINS_ENUM): void;
  readonly?: boolean;
  showModal?: boolean;
  direction?: 'top' | 'bottom';
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
  title?: React.ReactNode;
  chainRenderClassName?: string;
  arrowDownComponent?: React.ReactNode;
  bridge?: boolean;
  hideTestnetTab?: boolean;
  excludeChains?: CHAINS_ENUM[];
  drawerHeight?: number;
  showClosableIcon?: boolean;
  swap?: boolean;
  getContainer?: DrawerProps['getContainer'];
  disableChainCheck?: TDisableCheckChainFn;
  loading?: boolean;
}
export type ChainSelectorInSend = {
  toggleShow: (show: boolean) => void;
};
export const ChainSelectorInSend = React.forwardRef<
  ChainSelectorInSend,
  ChainSelectorProps
>(
  (
    {
      value,
      onChange,
      showModal = false,
      disabledTips,
      disableChainCheck,
      title,
      supportChains,
      hideTestnetTab = false,
      excludeChains,
      drawerHeight,
      showClosableIcon,
      getContainer,
    },
    ref
  ) => {
    const [showSelectorModal, setShowSelectorModal] = useState(showModal);

    const { t } = useTranslation();

    const handleCancel = useCallback(() => {
      setShowSelectorModal(false);
    }, []);

    const handleChange = useCallback(
      (value: CHAINS_ENUM) => {
        onChange?.(value);
        setShowSelectorModal(false);
      },
      [onChange]
    );

    const checkBeforeConfirm = useCallback(
      (value: CHAINS_ENUM) => {
        const chainServerId = findChain({ enum: value })?.serverId;
        if (chainServerId) {
          const { disable, reason } = disableChainCheck?.(chainServerId) || {};
          if (disable) {
            Modal.confirm({
              width: 340,
              closable: true,
              closeIcon: <></>,
              centered: true,
              className: 'chain-selector-disable-item-tips',
              title: <RiskWarningTitle />,
              content: reason,
              okText: t('global.proceedButton'),
              cancelText: t('global.cancelButton'),
              cancelButtonProps: {
                type: 'ghost',
                className: 'text-r-blue-default border-r-blue-default',
              },
              onOk() {
                handleChange(value);
              },
            });
            return;
          }
        }
        handleChange(value);
      },
      [disableChainCheck, handleChange, t]
    );

    useImperativeHandle(ref, () => ({
      toggleShow: (show: boolean) => {
        setShowSelectorModal(show);
      },
    }));

    return (
      <>
        <ChainSelectorModal
          height={drawerHeight}
          excludeChains={excludeChains}
          hideTestnetTab={hideTestnetTab}
          value={value}
          visible={showSelectorModal}
          onChange={checkBeforeConfirm}
          onCancel={handleCancel}
          supportChains={supportChains}
          disabledTips={disabledTips}
          disableChainCheck={disableChainCheck}
          title={title}
          showClosableIcon={showClosableIcon}
          showRPCStatus
          getContainer={getContainer}
        />
        <ChainGlobalStyle />
      </>
    );
  }
);
