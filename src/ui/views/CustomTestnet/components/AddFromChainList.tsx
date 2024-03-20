import { PageHeader } from '@/ui/component';
import { Chain } from '@debank/common';
import { Form, Input } from 'antd';
import React, { useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import IconSearch from 'ui/assets/search.svg';
import { CustomTestnetItem } from './CustomTestnetItem';
import clsx from 'clsx';
import { useInfiniteScroll } from 'ahooks';
import { intToHex, useWallet } from '@/ui/utils';
import {
  TestnetChain,
  createTestnetChain,
} from '@/background/service/customTestnet';
import { Emtpy } from './Empty';
import { findChain } from '@/utils/chain';
import { id } from 'ethers/lib/utils';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const Wraper = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background-color: var(--r-neutral-bg1, #fff);
  transform: translateX(100%);
  transition: transform 0.3s;
  border-radius: 16px 16px 0px 0px;
  padding: 20px 0 0 0;

  display: flex;
  flex-direction: column;

  .ant-input-affix-wrapper {
    color: var(--r-neutral-foot, #6a7587);
    font-size: 13px;
    font-weight: 400;
    margin-bottom: 20px;
    height: 44px;

    border-radius: 6px;
    background: var(--r-neutral-card1, #fff);
    border: 0.5px solid var(--r-neutral-line, #d3d8e0);

    &-focused {
      border: 0.5px solid var(--r-blue-default, #7084ff);
    }
  }

  .chain-list-item:not(:last-child)::after {
    position: absolute;
    content: ' ';
    left: 16px;
    right: 16px;
    bottom: 0;
    border-bottom: 0.5px solid var(--r-neutral-line, #d3d8e0);
  }
`;

export const AddFromChainList = ({
  visible,
  onClose,
  className,
  onSelect,
}: {
  visible?: boolean;
  className?: string;
  onClose?: () => void;
  onSelect?: (chain: TestnetChain) => void;
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [search, setSearch] = React.useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { loading, data } = useInfiniteScroll(
    async (data) => {
      const res = await wallet.openapi.searchChainList({
        start: data?.start || 0,
        limit: 10,
        q: search,
      });

      return {
        list: res.chain_list.map((item) => {
          return createTestnetChain({
            name: item.name,
            id: item.chain_id,
            nativeTokenSymbol: item.native_currency.symbol,
            rpcUrl: item.rpc || '',
            scanLink: item.explorer || '',
          });
        }),
        start: res.page.start + res.page.limit,
        total: res.page.total,
      };
    },
    {
      isNoMore(data) {
        return !!data && (data.list?.length || 0) >= (data?.total || 0);
      },
      reloadDeps: [search],
      target: ref,
    }
  );
  console.log(data, loading);
  return (
    <Wraper className={clsx({ 'translate-x-0': visible }, className)}>
      <div className="px-[20px]">
        <PageHeader className="pt-0" forceShowBack onBack={onClose}>
          Quick add from Chainlist
        </PageHeader>
        <Input
          prefix={<img src={IconSearch} />}
          placeholder={t('component.ChainSelectorModal.searchPlaceholder')}
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          allowClear
        />
      </div>
      <div ref={ref} className="flex-1 overflow-auto px-[20px] ">
        <div className="rounded-[6px] bg-r-neutral-card2 h-full">
          {loading ? null : !data?.list?.length ? (
            <Emtpy description="No chains found" />
          ) : (
            <>
              {data?.list?.map((item) => {
                const chain = findChain({ id: item.id });

                return chain ? (
                  <TooltipWithMagnetArrow
                    className="rectangle w-[max-content]"
                    key={item.id + 'tooltip'}
                    align={{
                      offset: [0, 30],
                    }}
                    placement="top"
                    title={
                      chain?.isTestnet
                        ? "You've already added this chain"
                        : 'Chain already supported by Rabby Wallet'
                    }
                  >
                    <div>
                      <CustomTestnetItem
                        item={item}
                        // onClick={onSelect}
                        className="relative chain-list-item opacity-50"
                      />
                    </div>
                  </TooltipWithMagnetArrow>
                ) : (
                  <CustomTestnetItem
                    item={item}
                    key={item.id}
                    onClick={onSelect}
                    className="relative chain-list-item"
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    </Wraper>
  );
};
