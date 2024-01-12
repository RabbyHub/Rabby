import { Drawer, Input, Modal } from 'antd';
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
import { CHAINS_ENUM } from 'consts';
import IconSearch from 'ui/assets/search.svg';
import { SvgIconCross } from 'ui/assets';

const closeIcon = (
  <SvgIconCross className="w-14 fill-current text-gray-content" />
);

import Empty from '../Empty';
import {
  SelectChainList,
  SelectChainListProps,
} from './components/SelectChainList';
import { findChainByEnum, varyAndSortChainItems } from '@/utils/chain';
import NetSwitchTabs, {
  NetSwitchTabsKey,
  useSwitchNetTab,
} from '../PillsSwitch/NetSwitchTabs';
import { useTranslation } from 'react-i18next';

interface ChainSelectorModalProps {
  visible: boolean;
  value?: CHAINS_ENUM;
  onCancel?(): void;
  onChange?(val: CHAINS_ENUM): void;
  connection?: boolean;
  title?: ReactNode;
  className?: string;
  supportChains?: SelectChainListProps['supportChains'];
  disabledTips?: SelectChainListProps['disabledTips'];
  hideTestnetTab?: boolean;
  showRPCStatus?: boolean;
  height?: number;
}

const useChainSeletorList = ({
  supportChains,
  netTabKey,
}: {
  supportChains?: Chain['enum'][];
  netTabKey?: NetSwitchTabsKey;
}) => {
  const [search, setSearch] = useState('');
  const { pinned, chainBalances } = useRabbySelector((state) => {
    return {
      pinned: (state.preference.pinnedChain?.filter((item) =>
        findChainByEnum(item)
      ) || []) as CHAINS_ENUM[],
      chainBalances:
        netTabKey === 'testnet'
          ? state.account.testnetMatteredChainBalances
          : state.account.matteredChainBalances,
      isShowTestnet: state.preference.isShowTestnet,
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
  const { allSearched, matteredList, unmatteredList } = useMemo(() => {
    const searchKw = search?.trim().toLowerCase();
    const result = varyAndSortChainItems({
      supportChains,
      searchKeyword: searchKw,
      matteredChainBalances: chainBalances,
      pinned,
      netTabKey,
    });

    return {
      allSearched: result.allSearched,
      matteredList: searchKw ? [] : result.matteredList,
      unmatteredList: searchKw ? [] : result.unmatteredList,
    };
  }, [search, pinned, supportChains, chainBalances, netTabKey]);

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

export const ChainSelectorLargeModal = ({
  title,
  visible,
  onCancel,
  onChange,
  value,
  connection = false,
  className,
  supportChains,
  disabledTips,
  hideTestnetTab = false,
  showRPCStatus = false,
  height = 494,
}: ChainSelectorModalProps) => {
  const handleCancel = () => {
    onCancel?.();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange?.(val);
  };

  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab({
    hideTestnetTab,
  });

  const { t } = useTranslation();

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
    netTabKey: selectedTab,
  });

  useEffect(() => {
    if (!value || !visible) return;

    const chainItem = findChainByEnum(value);
    onTabChange(chainItem?.isTestnet ? 'testnet' : 'mainnet');
  }, [value, visible, onTabChange]);

  const rDispatch = useRabbyDispatch();

  useEffect(() => {
    if (!visible) {
      setSearch('');
    } else {
      // (async () => {
      //   // await rDispatch.account.triggerFetchBalanceOnBackground();
      //   rDispatch.account.getMatteredChainBalance();
      // })();
      rDispatch.account.getMatteredChainBalance();
    }
  }, [visible, rDispatch]);

  return (
    <Modal
      width={480}
      footer={null}
      visible={visible}
      onCancel={handleCancel}
      className={clsx(
        'chain-selector-large-modal',
        connection && 'connection',
        className
      )}
      closeIcon={closeIcon}
      centered
      destroyOnClose
    >
      <header className={title ? 'pt-[0px]' : 'pt-[20px]'}>
        <div className="modal-title">{title}</div>
        {isShowTestnet && (
          <NetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
            className="h-[28px] box-content mt-[20px] mb-[20px]"
          />
        )}
        <Input
          prefix={<img src={IconSearch} />}
          // Search chain
          placeholder={t('component.ChainSelectorModal.searchPlaceholder')}
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          allowClear
        />
      </header>
      <div className="chain-selector-large-modal-content">
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
            <Empty>
              {/* No chains */}
              {t('component.ChainSelectorModal.noChains')}
            </Empty>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};
