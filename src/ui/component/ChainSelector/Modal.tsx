import { Drawer, Input } from 'antd';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Chain } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import IconSearch from 'ui/assets/search.svg';
import Empty from '../Empty';
import {
  SelectChainList,
  SelectChainListProps,
} from './components/SelectChainList';
import { findChainByEnum } from '@/utils/chain';
interface ChainSelectorModalProps {
  visible: boolean;
  value?: CHAINS_ENUM;
  onCancel(): void;
  onChange(val: CHAINS_ENUM): void;
  connection?: boolean;
  title?: ReactNode;
  className?: string;
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
  showRPCStatus?: boolean;
  height?: number;
}

const useSetup = () => {
  const [search, setSearch] = useState('');
  const pinned = useRabbySelector(
    (state) =>
      state.preference.pinnedChain?.filter((item) => findChainByEnum(item)) ||
      []
  );
  const dispatch = useRabbyDispatch();

  // we have ensured all chain enum is valid above
  const _pinnedList = pinned.map((chain) => CHAINS[chain]);
  const _all = Object.values(CHAINS).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleStarChange = (chain: CHAINS_ENUM, value) => {
    if (value) {
      dispatch.preference.addPinnedChain(chain);
    } else {
      dispatch.preference.removePinnedChain(chain);
    }
  };
  const handleSort = (chains: Chain[]) => {
    dispatch.preference.updatePinnedChainList(chains.map((item) => item.enum));
  };
  const searchChains = useCallback(
    (list: Chain[], input: string) => {
      input = input?.trim().toLowerCase();
      if (!input) {
        return list.filter((item) => !pinned.includes(item.enum));
      }
      const res = list.filter((item) =>
        [item.name, item.enum, item.nativeTokenSymbol].some((item) =>
          item.toLowerCase().includes(input)
        )
      );
      return res
        .filter((item) => pinned.includes(item.enum))
        .concat(res.filter((item) => !pinned.includes(item.enum)));
    },
    [pinned]
  );
  const pinnedList = search?.trim() ? [] : _pinnedList;
  const all = searchChains(_all, search);

  useEffect(() => {
    dispatch.preference.getPreference('pinnedChain');
  }, [dispatch]);

  return {
    pinnedList,
    all,
    handleStarChange,
    handleSort,
    search,
    setSearch,
    pinned,
  };
};

const ChainSelectorModal = ({
  title,
  visible,
  onCancel,
  onChange,
  value,
  connection = false,
  className,
  supportChains,
  disabledTips,
  showRPCStatus = false,
  height = 400,
}: ChainSelectorModalProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };

  const {
    all,
    pinnedList,
    handleStarChange,
    handleSort,
    search,
    setSearch,
    pinned,
  } = useSetup();

  useEffect(() => {
    if (!visible) {
      setSearch('');
    }
  }, [visible]);

  return (
    <Drawer
      title={title}
      width="400px"
      height={height}
      closable={false}
      placement={'bottom'}
      visible={visible}
      onClose={handleCancel}
      className={clsx(
        'chain-selector__modal',
        connection && 'connection',
        className
      )}
      destroyOnClose
    >
      <header className={title ? 'pt-[8px]' : 'pt-[20px]'}>
        <Input
          prefix={<img src={IconSearch} />}
          placeholder="Search chain"
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          allowClear
        />
      </header>
      <div className="chain-selector__modal-content">
        <SelectChainList
          supportChains={supportChains}
          data={pinnedList}
          sortable={!supportChains}
          pinned={pinned as CHAINS_ENUM[]}
          onStarChange={handleStarChange}
          onSort={handleSort}
          onChange={handleChange}
          value={value}
          disabledTips={disabledTips}
          showRPCStatus={showRPCStatus}
        ></SelectChainList>
        <SelectChainList
          supportChains={supportChains}
          data={all}
          value={value}
          pinned={pinned as CHAINS_ENUM[]}
          onStarChange={handleStarChange}
          onChange={handleChange}
          disabledTips={disabledTips}
          showRPCStatus={showRPCStatus}
        ></SelectChainList>
        {pinnedList.length === 0 && all.length === 0 ? (
          <div className="select-chain-list pt-[70px] pb-[120px]">
            <Empty>No chains</Empty>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
};

export default ChainSelectorModal;
