import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { SvgIconArrowDownTriangle } from 'ui/assets';
import Modal from './Modal';

import './style.less';
import { SelectChainListProps } from './components/SelectChainList';
import { useRabbySelector } from '@/ui/store';
// import { DEX } from '@/ui/views/DexSwap/component/DexSelect';
import { DEX_SUPPORT_CHAINS } from '@rabby-wallet/rabby-swap';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange?(value: CHAINS_ENUM): void;
  readonly?: boolean;
  showModal?: boolean;
  direction?: 'top' | 'bottom';
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
}

const ChainSelector = ({
  value,
  onChange,
  readonly = false,
  showModal = false,
  supportChains,
}: ChainSelectorProps) => {
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
      <div className="chain-tag-selector" onClick={handleClickSelector}>
        On{' '}
        <span className="chain-tag-selector__name flex-1">
          {CHAINS[value].name}
        </span>
        {!readonly && (
          <SvgIconArrowDownTriangle className="icon icon-arrow-down" />
        )}
      </div>
      {!readonly && (
        <Modal
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          supportChains={supportChains}
        />
      )}
    </>
  );
};

export const SwapChainSelector = ({
  value,
  onChange,
  readonly = false,
  showModal = false,
  disabledTips,
}: // supportChains,
ChainSelectorProps) => {
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

  const dexId = useRabbySelector((s) => s.swap.selectedDex);

  if (!dexId) {
    return null;
  }
  const supportChains = DEX_SUPPORT_CHAINS[dexId];

  return (
    <>
      <div
        className="flex items-center cursor-pointer"
        onClick={handleClickSelector}
      >
        <img
          src={CHAINS[value].logo}
          className="w-[16px] h-[16px] mr-6 overflow-hidden"
        />
        <span className="text-13 font-medium text-gray-title">
          {CHAINS[value].name}
        </span>
        {!readonly && (
          <SvgIconArrowDownTriangle className="icon icon-arrow-down" />
        )}
      </div>
      {!readonly && (
        <Modal
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          supportChains={supportChains}
          disabledTips={disabledTips}
        />
      )}
    </>
  );
};

export default ChainSelector;
