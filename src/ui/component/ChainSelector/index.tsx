import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { CHAINS_ENUM } from 'consts';
import { useHover, useWallet } from 'ui/utils';
import { ReactComponent as ArrowDownSVG } from '@/ui/assets/dashboard/arrow-down.svg';
import ChainSelectorModal from './Modal';
import ChainIcon from '../ChainIcon';

import './style.less';
import clsx from 'clsx';
import {
  defaultTestnetChains,
  findChain,
  findChainByEnum,
} from '@/utils/chain';
import { ChainSelectorPurpose } from '@/ui/hooks/useChain';
import { Flex, Select } from '@radix-ui/themes';
import { useChainSeletorList } from 'ui/component/ChainSelector/Select';
import { useRabbySelector } from 'ui/store';

interface ChainSelectorProps {
  isDisabled?: boolean;
  value: CHAINS_ENUM;
  onChange(value: CHAINS_ENUM): void;
  direction?: 'top' | 'bottom';
  connection?: boolean;
  showModal?: boolean;
  className?: string;
  title?: ReactNode;
  onAfterOpen?: () => void;
  showRPCStatus?: boolean;
  modalHeight?: number;
}

const ChainSelector = ({
  isDisabled,
  title,
  value,
  onChange,
  connection = false,
  showModal = false,
  className = '',
  onAfterOpen,
  showRPCStatus = false,
  modalHeight,
}: ChainSelectorProps) => {
  const [showSelectorModal, setShowSelectorModal] = useState(showModal);
  const [isHovering, hoverProps] = useHover();
  const [customRPC, setCustomRPC] = useState('');
  const wallet = useWallet();

  const testnetChainList = defaultTestnetChains;
  // Custom logic for the Chain Select Popup instead of the Chain Select Modal
  const {
    chainBalances,
    mainnetList,
    testnetList,
    networkType,
    networkChainsList,
  } = useRabbySelector((state) => {
    return {
      chainBalances:
        state.chains.networkType === 'testnet'
          ? {}
          : state.account.matteredChainBalances,
      pinned: (state.preference.pinnedChain?.filter((item) =>
        findChain({ enum: item })
      ) || []) as CHAINS_ENUM[],
      isShowTestnet: state.preference.isShowTestnet,
      networkType: state.chains.networkType,
      mainnetList: state.chains.mainnetList,
      testnetList: state.chains.testnetList,
      networkChainsList:
        state.chains.networkType === 'testnet'
          ? // ? [...testnetChainList, ...state.chains.testnetList]
            state.chains.testnetList
          : state.chains.mainnetList,
    };
  });

  const handleClickSelector = () => {
    setShowSelectorModal(true);
    onAfterOpen?.();
  };

  const handleCancel = () => {
    setShowSelectorModal(false);
  };

  const handleChange = (value: CHAINS_ENUM) => {
    onChange(value);
    setShowSelectorModal(false);
  };

  const getCustomRPC = async () => {
    const rpc = await wallet.getCustomRpcByChain(value);
    setCustomRPC(rpc?.enable ? rpc.url : '');
  };

  const handleSwitchNetwork = (chainEnum: CHAINS_ENUM) => {
    console.log('Finding network', chainEnum);
    const chain = findChainByEnum(chainEnum);
    console.log('Found network', chain);

    if (chain) {
      console.log('Switching to chain:', chain);
      onChange(chain.enum);
      // setCustomRPC(chain.customRPC || '');
    }
  };

  useEffect(() => {
    getCustomRPC();
  }, [value]);

  return (
    <>
      <Select.Root
        disabled={isDisabled}
        size={'2'}
        onValueChange={handleSwitchNetwork}
        // value={currentNetwork?.id?.toString() || networks[0]?.value}
        value={findChainByEnum(value)?.enum}
      >
        <Select.Trigger variant={'soft'} placeholder="Select a network">
          <Flex as="span" align="center" gap="2">
            <ChainIcon
              chain={value}
              customRPC={customRPC}
              size="small"
              showCustomRPCToolTip
            />
            {findChainByEnum(value)?.name}
          </Flex>
        </Select.Trigger>
        <Select.Content
          variant="solid"
          color="gray"
          highContrast
          position="popper"
        >
          <Select.Group>
            <Select.Label>{networkType.toUpperCase()}</Select.Label>
            {networkChainsList.map((network) => (
              <Select.Item key={network.id} value={network.enum}>
                {network.name}
              </Select.Item>
            ))}
          </Select.Group>
        </Select.Content>
      </Select.Root>

      {/*<div
        className={clsx('chain-selector', className, isHovering && 'hover')}
        onClick={handleClickSelector}
        {...hoverProps}
      >
        <div className="mr-6">
          <ChainIcon
            chain={value}
            customRPC={customRPC}
            size="small"
            showCustomRPCToolTip
          />
        </div>
        <span className="flex-1 whitespace-nowrap overflow-hidden overflow-ellipsis">
          {findChainByEnum(value)?.name}
        </span>
        <ArrowDownSVG className={clsx('icon')} />
      </div>*/}
      <ChainSelectorModal
        title={title}
        value={value}
        visible={showSelectorModal}
        onChange={handleChange}
        onCancel={handleCancel}
        connection={connection}
        showRPCStatus={showRPCStatus}
        height={modalHeight}
      />
    </>
  );
};

export default ChainSelector;
