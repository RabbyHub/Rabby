import React, { useEffect, useMemo } from 'react';

import { Chain, CHAINS_ENUM } from '@debank/common';
import clsx from 'clsx';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  findChain,
  findChainByEnum,
  varyAndSortChainItems,
} from '@/utils/chain';
import { NetSwitchTabsKey } from '../PillsSwitch/NetSwitchTabs';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TestnetChainLogo } from '../TestnetChainLogo';
import ChainIcon from '../ChainIcon';
import { getTokenSymbol } from '@/ui/utils/token';

import { ReactComponent as RcDownCC } from '@/ui/assets/send-token/down-cc.svg';
import { ReactComponent as RcIconChainFilterCloseCC } from 'ui/assets/chain-select/chain-filter-close-cc.svg';

const useChains = ({ supportChains }: { supportChains?: Chain['enum'][] }) => {
  const { pinned, chainBalances } = useRabbySelector((state) => {
    return {
      pinned: (state.preference.pinnedChain?.filter((item) =>
        findChain({ enum: item })
      ) || []) as CHAINS_ENUM[],
      chainBalances: state.account.matteredChainBalances,
      isShowTestnet: state.preference.isShowTestnet,
    };
  });

  const dispatch = useRabbyDispatch();

  const { mainnetList, testnetList } = useRabbySelector((state) => {
    return {
      mainnetList: state.chains.mainnetList,
      testnetList: state.chains.testnetList,
    };
  });
  const { matteredList, unmatteredList } = useMemo(() => {
    const result = varyAndSortChainItems({
      supportChains,
      matteredChainBalances: chainBalances,
      pinned,
      mainnetList,
      testnetList,
    });

    return {
      // allSearched: result.allSearched,
      matteredList: result.matteredList,
      unmatteredList: result.unmatteredList,
    };
  }, [mainnetList, testnetList, pinned, supportChains, chainBalances]);

  useEffect(() => {
    dispatch.preference.getPreference('pinnedChain');
  }, [dispatch]);

  return {
    chainList: matteredList.concat(unmatteredList),
    pinned,
  };
};

const SHOW_COUNT = 3;

export function ChainFilterV2Line({
  selectedChain: propSelectedChain,
  onChange,
  onStartSelectChain,
  onClearFilterChain,
  showRPCStatus = false,
  supportChains,
  className,
}: {
  selectedChain?: CHAINS_ENUM | Chain | null;
  onChange?: (chain: Chain) => void;
  onStartSelectChain?: () => void;
  onClearFilterChain?: () => void;
  showRPCStatus?: boolean;
  supportChains?: CHAINS_ENUM[];
  className?: string;
}) {
  const { t } = useTranslation();
  const selectedChain = useMemo(() => {
    return !propSelectedChain
      ? null
      : typeof propSelectedChain === 'string'
      ? findChainByEnum(propSelectedChain)
      : propSelectedChain;
  }, [propSelectedChain]);

  // const { chainList } = useChains({
  //   supportChains,
  // });

  // const { top3Chains, selectedIndex } = useMemo(() => {
  //   const ret = {
  //     top3Items: chainList.slice(0, SHOW_COUNT),
  //     selectedIndex: -1,
  //     restChainCount: 0,
  //   };

  //   ret.top3Items = ret.top3Items.slice(0, SHOW_COUNT);
  //   ret.restChainCount = Math.max(chainList.length - ret.top3Items.length, 0);
  //   return {
  //     ...ret,
  //     top3Chains: ret.top3Items,
  //     hasAddItem: ret.top3Items.length >= SHOW_COUNT - 1,
  //   };
  // }, [chainList, selectedChain]);

  // const { customRPC } = useRabbySelector((s) => ({
  //   customRPC: s.customRPC.customRPC,
  //   // cachedChainBalances: {
  //   //   mainnet: s.account.matteredChainBalances,
  //   //   testnet: s.account.testnetMatteredChainBalances,
  //   // },
  // }));
  // const dispatch = useRabbyDispatch();
  // useEffect(() => {
  //   dispatch.customRPC.getAllRPC();
  // }, []);

  return (
    <div
      className={clsx(
        'chain-filters-line flex flex-row justify-between items-center',
        // 'gap-[10px]',
        className
      )}
    >
      {selectedChain ? (
        <div
          className={clsx(
            'h-[32px] py-[4px] px-[8px] rounded-[8px] cursor-pointer',
            'flex items-center justify-start',
            'border-[1px] border-[solid] border-transparent bg-r-neutral-card1',
            'hover:border-rabby-blue-default hover:bg-r-blue-light1'
          )}
          onClick={() => {
            onClearFilterChain?.();
          }}
        >
          <div>
            {selectedChain.isTestnet ? (
              selectedChain.logo ? (
                <img
                  src={selectedChain.logo}
                  alt=""
                  className="select-chain-item-icon"
                />
              ) : (
                <TestnetChainLogo
                  name={selectedChain.name}
                  className="select-chain-item-icon"
                />
              )
            ) : (
              <img
                src={selectedChain.logo}
                alt=""
                className="select-chain-item-icon"
              />
            )}
          </div>

          <div className="ml-[4px]">
            <span className="text-[13px] text-r-neutral-body font-[600]">
              {selectedChain.name || selectedChain.nativeTokenSymbol}
            </span>
          </div>

          <RcIconChainFilterCloseCC className="ml-[4px] text-r-neutral-foot w-[16px] h-[16px]" />
        </div>
      ) : (
        <div
          className="h-[32px] py-[4px] px-[8px] rounded-[8px] bg-r-neutral-card1 flex items-center justify-start cursor-pointer"
          onClick={() => {
            onStartSelectChain?.();
          }}
        >
          {/* <div
            style={{
              minWidth: 16 * top3Chains.length - 2 * (top3Chains.length - 1),
            }}
            className="flex items-center justify-start"
          >
            {top3Chains.map((data, index) => {
              const key = `${data.id}-${data.enum}-${index}`;

              return (
                <div
                  key={key}
                  className={clsx(
                    'flex justify-center items-center',
                    'w-[16px] h-[16px] rounded-[100%]',
                    'border-[1px] border-[solid] border-r-neutral-card1'
                  )}
                  style={{ left: index * -2, position: 'relative' }}
                  // onClick={() => {
                  //   onChange?.(data);
                  // }}
                >
                  <div className="flex items-center flex-1">
                    {data.isTestnet ? (
                      data.logo ? (
                        <img
                          src={data.logo}
                          alt=""
                          className="select-chain-item-icon"
                        />
                      ) : (
                        <TestnetChainLogo
                          name={data.name}
                          className="select-chain-item-icon"
                        />
                      )
                    ) : (
                      <img
                        src={data.logo}
                        alt=""
                        className="select-chain-item-icon"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div> */}

          <div className="ml-[4px]">
            <span className="text-[13px] text-r-neutral-body font-[600]">
              {t('component.TokenSelector.chainFilterLine.filterAll')}
            </span>
          </div>

          <RcDownCC className="ml-[4px] text-r-neutral-foot w-[16px] h-[16px]" />
        </div>
      )}
    </div>
  );
}
