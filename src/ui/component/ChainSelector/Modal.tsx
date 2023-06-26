import { Drawer, Input } from 'antd';
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
import { findChainByEnum, sortChainItems } from '@/utils/chain';
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

const useChainSeletorList = ({
  supportChains,
}: {
  supportChains?: Chain['enum'][];
}) => {
  const [search, setSearch] = useState('');
  const { pinned, matteredChainBalances } = useRabbySelector((state) => {
    return {
      pinned:
        state.preference.pinnedChain?.filter((item) => findChainByEnum(item)) ||
        [],
      matteredChainBalances: state.account.matteredChainBalances,
    };
  });
  const dispatch = useRabbyDispatch();

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
  const { allSearched, matteredList, unmatteredList } = useMemo(() => {
    let unpinnedChainListWithBalance = [] as Chain[];
    let pinnedChainListWithBalance = [] as Chain[];
    const pinnedChainListWithoutBalance = [] as Chain[];
    const unmatteredList = [] as Chain[];

    // we have ensured allSearched chain enum is valid above
    const _pinnedList = pinned.map((chain) => CHAINS[chain]);

    const _all = Object.values(CHAINS).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    _all.forEach((item) => {
      const inPinned = pinned.find((pinnedEnum) => pinnedEnum === item.enum);

      if (!inPinned) {
        if (!matteredChainBalances[item.serverId]) {
          unmatteredList.push(item);
        } else {
          unpinnedChainListWithBalance.push(item);
        }
      } else {
        if (!matteredChainBalances[item.serverId]) {
          pinnedChainListWithoutBalance.push(item);
        } else {
          pinnedChainListWithBalance.push(item);
        }
      }
    });

    unpinnedChainListWithBalance = sortChainItems(
      unpinnedChainListWithBalance,
      { supportChains, cachedChainBalances: matteredChainBalances }
    );
    pinnedChainListWithBalance = sortChainItems(pinnedChainListWithBalance, {
      supportChains,
      cachedChainBalances: matteredChainBalances,
    });
    const searchKw = search?.trim();

    const allSearched = searchChains(_all, search);

    return {
      allSearched,
      matteredList: searchKw
        ? []
        : pinnedChainListWithBalance
            .concat(pinnedChainListWithoutBalance)
            .concat(unpinnedChainListWithBalance),
      unmatteredList: searchKw ? [] : unmatteredList,
    };
  }, [search, pinned, supportChains, matteredChainBalances]);

  useEffect(() => {
    dispatch.preference.getPreference('pinnedChain');
  }, [dispatch]);

  return {
    matteredList,
    unmatteredList: search?.trim() ? allSearched : unmatteredList,
    allSearched,
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
  height = 494,
}: ChainSelectorModalProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };

  const {
    matteredList,
    unmatteredList,
    handleStarChange,
    handleSort,
    search,
    setSearch,
    pinned,
  } = useChainSeletorList({
    supportChains,
  });

  const rDispatch = useRabbyDispatch();

  useEffect(() => {
    if (!visible) {
      setSearch('');
    } else {
      rDispatch.account.getMatteredChainBalance();
    }
  }, [visible, rDispatch]);

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
          data={matteredList}
          sortable={false /* !supportChains */}
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
          data={unmatteredList}
          value={value}
          pinned={pinned as CHAINS_ENUM[]}
          onStarChange={handleStarChange}
          onChange={handleChange}
          disabledTips={disabledTips}
          showRPCStatus={showRPCStatus}
        ></SelectChainList>
        {matteredList.length === 0 && unmatteredList.length === 0 ? (
          <div className="select-chain-list pt-[70px] pb-[120px]">
            <Empty>No chains</Empty>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
};

export default ChainSelectorModal;
