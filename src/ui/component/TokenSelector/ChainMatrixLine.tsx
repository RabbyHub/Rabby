import React, { useEffect, useMemo } from 'react';

import { Chain, CHAINS_ENUM } from '@debank/common';
import clsx from 'clsx';
import {
  findChain,
  findChainByEnum,
  varyAndSortChainItems,
} from '@/utils/chain';
import { NetSwitchTabsKey } from '../PillsSwitch/NetSwitchTabs';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TestnetChainLogo } from '../TestnetChainLogo';
import ChainIcon from '../ChainIcon';
import { Tooltip } from 'antd';
import { getTokenSymbol } from '@/ui/utils/token';

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

const SHOW_COUNT = 8;

export function ChainMatrixLine({
  selectedChain: propSelectedChain,
  onChange,
  onStartSelectChain,
  showRPCStatus = false,
  supportChains,
  className,
}: {
  selectedChain?: CHAINS_ENUM | Chain | null;
  onChange?: (chain: Chain) => void;
  onStartSelectChain?: () => void;
  showRPCStatus?: boolean;
  supportChains?: CHAINS_ENUM[];
  className?: string;
}) {
  const selectedChain = useMemo(() => {
    return typeof propSelectedChain === 'string'
      ? findChainByEnum(propSelectedChain)
      : propSelectedChain;
  }, [propSelectedChain]);

  const { chainList } = useChains({
    supportChains,
  });

  const {
    finalList,
    hasAddItem,
    selectedIndex,
    restChainCount,
  } = useMemo(() => {
    const ret = {
      top8Items: chainList.slice(0, SHOW_COUNT),
      selectedIndex: -1,
      restChainCount: 0,
    };

    if (selectedChain) {
      ret.selectedIndex = chainList.findIndex(
        (item) => item.serverId === selectedChain.serverId
      );
      if (ret.selectedIndex === -1 || ret.selectedIndex >= SHOW_COUNT - 1) {
        ret.top8Items.unshift(selectedChain);
        ret.selectedIndex = 0;
      }
    }

    ret.top8Items = ret.top8Items.slice(0, SHOW_COUNT);
    ret.restChainCount = Math.max(chainList.length - ret.top8Items.length, 0);
    return {
      ...ret,
      finalList:
        ret.top8Items.length >= SHOW_COUNT - 1
          ? ret.top8Items.slice(0, SHOW_COUNT - 1)
          : ret.top8Items,
      hasAddItem: ret.top8Items.length >= SHOW_COUNT - 1,
    };
  }, [chainList, selectedChain]);

  const { customRPC } = useRabbySelector((s) => ({
    customRPC: s.customRPC.customRPC,
    // cachedChainBalances: {
    //   mainnet: s.account.matteredChainBalances,
    //   testnet: s.account.testnetMatteredChainBalances,
    // },
  }));
  const dispatch = useRabbyDispatch();
  useEffect(() => {
    dispatch.customRPC.getAllRPC();
  }, []);

  return (
    <div
      className={clsx(
        'chain-matrix-line flex flex-row justify-between items-center',
        // 'gap-[10px]',
        className
      )}
    >
      {finalList.map((data, index) => {
        const key = `${data.id}-${data.enum}-${index}`;
        const isSelectedItem = index === selectedIndex;

        return (
          <Tooltip
            key={key}
            placement="top"
            overlayClassName="rectangle"
            title={data.name}
            align={{ targetOffset: [0, 0] }}
          >
            <div
              key={key}
              className={clsx(
                'flex justify-center items-center',
                'px-[4px] w-[36px] h-[36px] rounded-[4px]',
                'border-[1px] border-solid bg-white',
                'cursor-pointer',
                isSelectedItem
                  ? 'border-rabby-blue-default'
                  : 'border-rabby-neutral-line'
              )}
              style={{ width: 36, height: 36 }}
              onClick={() => {
                onChange?.(data);
              }}
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
                  <>
                    {showRPCStatus ? (
                      <ChainIcon
                        chain={data.enum}
                        customRPC={
                          customRPC[data.enum]?.enable
                            ? customRPC[data.enum].url
                            : ''
                        }
                        showCustomRPCToolTip
                      />
                    ) : (
                      <img
                        src={data.logo}
                        alt=""
                        className="select-chain-item-icon"
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </Tooltip>
        );
      })}
      {hasAddItem && !!restChainCount && (
        <div
          className={clsx(
            'flex justify-center items-center',
            'px-[4px] w-[36px] h-[36px] rounded-[4px]',
            'border-[1px] border-solid bg-white',
            'cursor-pointer',
            'border-rabby-neutral-line'
          )}
          style={{ width: 36, height: 36 }}
          onClick={() => {
            onStartSelectChain?.();
          }}
        >
          <div className="flex items-center justify-center">
            +{restChainCount}
          </div>
        </div>
      )}
    </div>
  );
}
