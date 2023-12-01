import React, { useState } from 'react';
import { CHAINS_ENUM, CHAINS } from 'consts';
import { SvgIconArrowDownTriangle } from 'ui/assets';
import Modal from './Modal';

import './style.less';
import { SelectChainListProps } from './components/SelectChainList';
import { useRabbySelector } from '@/ui/store';
import { DEX_SUPPORT_CHAINS } from '@/constant/dex-swap';
import { ReactComponent as SvgIconSwapArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down2.svg';
import { findChainByEnum } from '@/utils/chain';

interface ChainSelectorProps {
  value: CHAINS_ENUM;
  onChange?(value: CHAINS_ENUM): void;
  readonly?: boolean;
  showModal?: boolean;
  direction?: 'top' | 'bottom';
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
  title?: React.ReactNode;
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
          {findChainByEnum(value)?.name || ''}
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
  title,
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

  const chainItem = React.useMemo(() => {
    return findChainByEnum(value);
  }, [value]);

  return (
    <>
      <div
        className="flex items-center cursor-pointer"
        onClick={handleClickSelector}
      >
        <img
          src={chainItem?.logo || ''}
          className="w-[16px] h-[16px] rounded-[2px] mr-6  overflow-hidden"
        />
        <span className="text-13 font-medium text-r-neutral-title-1">
          {chainItem?.name || ''}
        </span>
        {!readonly && <SvgIconSwapArrowDownTriangle className="ml-4 pt-1" />}
      </div>
      {!readonly && (
        <Modal
          value={value}
          visible={showSelectorModal}
          onChange={handleChange}
          onCancel={handleCancel}
          supportChains={supportChains}
          disabledTips={disabledTips}
          title={title}
        />
      )}
    </>
  );
};

export default ChainSelector;
