import { Drawer, Input } from 'antd';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Chain } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import IconSearch from 'ui/assets/search.svg';
import Empty from '../Empty';
import { SelectChainList } from './components/SelectChainList';
interface ChainSelectorModalProps {
  visible: boolean;
  value: CHAINS_ENUM;
  onCancel(): void;
  onChange(val: CHAINS_ENUM): void;
  connection?: boolean;
  title?: ReactNode;
  className?: string;
}

const useSetup = () => {
  const [search, setSearch] = useState('');
  const pinned = useRabbySelector((state) => state.preference.pinnedChain);
  const dispatch = useRabbyDispatch();

  const _pinnedList = pinned.map((chain) => CHAINS[chain]);
  const _all = Object.values(CHAINS).sort((a, b) => (a.name > b.name ? 1 : -1));

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
      height={440}
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
          data={pinnedList}
          sortable
          pinned={pinned as CHAINS_ENUM[]}
          onStarChange={handleStarChange}
          onSort={handleSort}
          onChange={handleChange}
          value={value}
        ></SelectChainList>
        <SelectChainList
          data={all}
          value={
            pinnedList.find((item) => item.enum === value) ? undefined : value
          }
          pinned={pinned as CHAINS_ENUM[]}
          onStarChange={handleStarChange}
          onChange={handleChange}
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
