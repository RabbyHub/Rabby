import React, { InsHTMLAttributes, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { CHAINS_ENUM } from '@debank/common';

import { useState } from 'react';
import { SelectChainListProps } from '@/ui/component/ChainSelector/components/SelectChainList';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import styled, { createGlobalStyle } from 'styled-components';
import ChainIcon from '@/ui/component/ChainIcon';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { DrawerProps, Modal, Skeleton } from 'antd';
import { TDisableCheckChainFn } from './components/SelectChainItem';
import { RiskWarningTitle } from '../RiskWarningTitle';

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
const ChainWrapper = styled.div`
  /* height: 40px; */
  background: var(--r-neutral-card-2, #f2f4f7);
  border-radius: 6px;
  padding: 12px 12px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  &.bridge {
    width: auto;
    height: 28px;
    font-size: 13px;
    padding: 0 8px;
    gap: 0;
    & > {
      .down {
        margin-left: auto;
        width: 14px;
        height: 14px;
      }
      .name {
        color: var(--r-neutral-title-1, #192945);
        line-height: normal;
        margin-left: 6px;
        margin-right: 4px;
      }
    }
  }
  &.swap {
    gap: 8px;
    padding: 0 16px;
    border: 0.5px solid transparent;
    background: var(--r-neutral-card1, #fff);
    border-radius: 8px;
    height: 44px;
    position: relative;
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      border-radius: 8px;
      border: 0.5px solid var(--r-neutral-line, #e0e5ec);
    }

    &:hover {
      &::before {
        border: 1px solid var(--r-blue-default, #7084ff);
      }
    }

    & > .name {
      color: var(--r-neutral-title-1, #192945);
      font-size: 15px;
    }
  }
  &:hover {
    background: var(--r-blue-light2, #eef1ff);
  }
  & > {
    .down {
      margin-left: auto;
      width: 20px;
      height: 20px;
      color: var(--r-neutral-body, #3e495e);
    }
    .name {
      color: var(--r-neutral-title-1, #192945);
      line-height: 15px;
    }
  }
`;

export const ChainRender = ({
  chain,
  readonly,
  className,
  arrowDownComponent,
  bridge,
  swap,
  loading,
  ...other
}: {
  chain?: CHAINS_ENUM;
  readonly: boolean;
  arrowDownComponent?: React.ReactNode;
  bridge?: boolean;
  loading?: boolean;
  swap?: boolean;
} & InsHTMLAttributes<HTMLDivElement>) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const chainInfo = useMemo(() => {
    return findChain({ enum: chain });
  }, [chain]);
  const [customRPC, setCustomRPC] = useState('');
  const getCustomRPC = async () => {
    if (!chain) {
      setCustomRPC('');
      return;
    }
    const rpc = await wallet.getCustomRpcByChain(chain);
    setCustomRPC(rpc?.enable ? rpc.url : '');
  };
  useEffect(() => {
    getCustomRPC();
  }, [chain]);

  return (
    <ChainWrapper
      className={clsx(
        {
          'cursor-default hover:bg-r-neutral-bg-2': readonly,
          bridge,
          swap,
        },
        className
      )}
      {...other}
    >
      {loading ? (
        <>
          <Skeleton.Avatar className="bg-r-neutral-card2 w-[18px] h-[18px] rounded-full" />
          <Skeleton.Avatar className="bg-r-neutral-card2 w-[94px] h-[18px] rounded-[2px]" />
        </>
      ) : (
        <>
          {chain && (
            <ChainIcon
              chain={chain}
              customRPC={customRPC}
              size={'small'}
              innerClassName={clsx(
                bridge && 'w-[16px] h-[16px]',
                swap && 'w-[18px] h-[18px]'
              )}
              showCustomRPCToolTip
              tooltipProps={{
                visible: swap || bridge ? false : undefined,
              }}
            />
          )}
          <span className={clsx('name')}>
            {chainInfo?.name || t('page.bridge.Select')}
          </span>
        </>
      )}
      {/* {!readonly && <img className="down" src={ImgArrowDown} alt="" />} */}
      {!readonly &&
        (arrowDownComponent ? (
          arrowDownComponent
        ) : (
          <RcImgArrowDownCC className="down" viewBox="0 0 16 16" />
        ))}
    </ChainWrapper>
  );
};

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
export default function ChainSelectorInForm({
  value,
  onChange,
  readonly = false,
  showModal = false,
  disabledTips,
  disableChainCheck,
  title,
  supportChains,
  chainRenderClassName,
  arrowDownComponent,
  bridge,
  hideTestnetTab = false,
  excludeChains,
  drawerHeight,
  showClosableIcon,
  swap,
  loading,
  getContainer,
}: ChainSelectorProps) {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);

  const { t } = useTranslation();
  const handleClickSelector = () => {
    if (readonly) return;
    setShowSelectorModal(true);
  };

  const handleCancel = () => {
    if (readonly) return;
    setShowSelectorModal(false);
  };

  const handleChange = (value: CHAINS_ENUM) => {
    if (readonly) return;
    onChange && onChange(value);
    setShowSelectorModal(false);
  };
  const checkBeforeConfirm = (value: CHAINS_ENUM) => {
    if (readonly) return;
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
  };

  return (
    <>
      <ChainRender
        chain={value}
        onClick={handleClickSelector}
        readonly={readonly}
        className={chainRenderClassName}
        arrowDownComponent={arrowDownComponent}
        bridge={bridge}
        swap={swap}
        loading={loading}
      />
      {!readonly && (
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
      )}
      <ChainGlobalStyle />
    </>
  );
}
