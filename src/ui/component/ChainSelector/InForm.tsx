import React, { InsHTMLAttributes, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { CHAINS_ENUM } from '@debank/common';

import { useState } from 'react';
import { SelectChainListProps } from '@/ui/component/ChainSelector/components/SelectChainList';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import styled from 'styled-components';
import ChainIcon from '@/ui/component/ChainIcon';
import { ReactComponent as RcImgArrowDownCC } from '@/ui/assets/swap/arrow-down-cc.svg';
import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { useTranslation } from 'react-i18next';

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
    background: var(--r-blue-light1, #eef1ff);
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
  ...other
}: {
  chain?: CHAINS_ENUM;
  readonly: boolean;
  arrowDownComponent?: React.ReactNode;
  bridge?: boolean;
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
}
export default function ChainSelectorInForm({
  value,
  onChange,
  readonly = false,
  showModal = false,
  disabledTips,
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
}: ChainSelectorProps) {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);

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
      />
      {!readonly && (
        <ChainSelectorModal
          height={drawerHeight}
          excludeChains={excludeChains}
          hideTestnetTab={hideTestnetTab}
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          supportChains={supportChains}
          disabledTips={disabledTips}
          title={title}
          showClosableIcon={showClosableIcon}
          showRPCStatus
        />
      )}
    </>
  );
}
