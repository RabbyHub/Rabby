import { Button, Drawer, Input } from 'antd';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Chain } from 'background/service/openapi';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import IconSearch from 'ui/assets/search.svg';

import { useWallet } from '@/ui/utils';
import {
  findChain,
  findChainByEnum,
  varyAndSortChainItems,
} from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import Empty from '../Empty';
import NetSwitchTabs, {
  NetSwitchTabsKey,
  useSwitchNetTab,
} from '../PillsSwitch/NetSwitchTabs';
import {
  SelectChainList,
  SelectChainListProps,
} from './components/SelectChainList';

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
  hideTestnetTab?: boolean;
  hideMainnetTab?: boolean;
  showRPCStatus?: boolean;
  height?: number;
  zIndex?: number;
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
        findChain({ enum: item })
      ) || []) as CHAINS_ENUM[],
      chainBalances:
        netTabKey === 'testnet' ? {} : state.account.matteredChainBalances,
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
  const { mainnetList, testnetList } = useRabbySelector((state) => {
    return {
      mainnetList: state.chains.mainnetList,
      testnetList: state.chains.testnetList,
    };
  });
  const { allSearched, matteredList, unmatteredList } = useMemo(() => {
    const searchKw = search?.trim().toLowerCase();
    const result = varyAndSortChainItems({
      supportChains,
      searchKeyword: searchKw,
      matteredChainBalances: chainBalances,
      pinned,
      netTabKey,
      mainnetList,
      testnetList,
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
  hideTestnetTab = false,
  hideMainnetTab = false,
  showRPCStatus = false,
  height = 494,
  zIndex,
}: ChainSelectorModalProps) => {
  const handleCancel = () => {
    onCancel();
  };

  const handleChange = (val: CHAINS_ENUM) => {
    onChange(val);
  };

  const { isShowTestnet, selectedTab, onTabChange } = useSwitchNetTab({
    hideTestnetTab,
  });

  const { t } = useTranslation();

  const history = useHistory();

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
    netTabKey: !hideMainnetTab ? selectedTab : 'testnet',
  });

  useEffect(() => {
    if (!value || !visible) return;

    const chainItem = findChainByEnum(value);
    onTabChange(chainItem?.isTestnet ? 'testnet' : 'mainnet');
  }, [value, visible, onTabChange]);

  const rDispatch = useRabbyDispatch();
  const wallet = useWallet();

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
    <>
      <Drawer
        title={title}
        width="400px"
        height={height}
        closable={false}
        placement={'bottom'}
        visible={visible}
        onClose={handleCancel}
        className={clsx(
          'custom-popup is-support-darkmode',
          'chain-selector__modal',
          connection && 'connection',
          className
        )}
        zIndex={zIndex}
        destroyOnClose
      >
        <header className={title ? 'pt-[8px]' : 'pt-[20px]'}>
          {isShowTestnet && !hideMainnetTab && (
            <NetSwitchTabs
              value={selectedTab}
              onTabChange={onTabChange}
              className="h-[28px] box-content mt-[20px] mb-[20px]"
            />
          )}
          {matteredList.length === 0 &&
          unmatteredList.length === 0 &&
          !search ? null : (
            <Input
              prefix={<img src={IconSearch} />}
              // Search chain
              placeholder={t('component.ChainSelectorModal.searchPlaceholder')}
              onChange={(e) => setSearch(e.target.value)}
              value={search}
              allowClear
            />
          )}
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
            <div className="select-chain-list pt-[70px] bg-transparent">
              <Empty>
                {/* No chains */}
                {t('component.ChainSelectorModal.noChains')}
              </Empty>
              {selectedTab === 'testnet' ? (
                <div className="text-center mt-[50px]">
                  <Button
                    type="primary"
                    onClick={() => {
                      history.push('/custom-testnet');
                    }}
                    className="w-[200px] h-[44px]"
                  >
                    {t('component.ChainSelectorModal.addTestnet')}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Drawer>
    </>
  );
};

export default ChainSelectorModal;
