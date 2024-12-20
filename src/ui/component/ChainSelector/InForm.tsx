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
  &.mini {
    width: auto;
    height: 28px;
    font-size: 13px;
    padding: 0 6px;

    & > {
      .down {
        margin-left: auto;
        width: 14px;
        height: 14px;
      }
      .name {
        color: var(--r-neutral-title-1, #192945);
        line-height: normal;
      }
    }
  }
  &.inlineHover {
    background: transparent;
    gap: 4px;
    & > .name {
      color: var(--r-neutral-body, #3e495e);
    }
    &:hover {
      background: transparent;
      .name,
      .down {
        color: var(--r-blue-default, #7084ff);
      }
    }
  }
  &:hover {
    background: rgba(134, 151, 255, 0.2);
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
  mini,
  inlineHover,
  ...other
}: {
  chain?: CHAINS_ENUM;
  readonly: boolean;
  arrowDownComponent?: React.ReactNode;
  mini?: boolean;
  inlineHover?: boolean;
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
          mini,
          inlineHover,
        },
        className
      )}
      {...other}
    >
      {/* <img className="logo" src={CHAINS[chain].logo} alt={CHAINS[chain].name} /> */}
      {chain && (
        <ChainIcon
          chain={chain}
          customRPC={customRPC}
          size={inlineHover ? 'mini' : 'small'}
          showCustomRPCToolTip
          tooltipProps={{
            visible: inlineHover ? false : undefined,
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
          <RcImgArrowDownCC className="down" viewBox="0 0 20 20" />
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
  mini?: boolean;
  hideTestnetTab?: boolean;
  excludeChains?: CHAINS_ENUM[];
  drawerHeight?: number;
  showClosableIcon?: boolean;
  inlineHover?: boolean;
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
  mini,
  hideTestnetTab = false,
  excludeChains,
  drawerHeight,
  showClosableIcon,
  inlineHover,
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
        mini={mini}
        inlineHover={inlineHover}
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
