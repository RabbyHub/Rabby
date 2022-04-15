import { Chain, TokenItem } from '@/background/service/openapi';
import clsx from 'clsx';
import _ from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList } from 'react-window';
import { getChain } from 'utils';
import { TokenGroup } from './TokenGroup';

interface TokenGroupListProps extends Partial<Chain> {
  data: TokenItem[];
  className?: string;
  onTokenClick(token: TokenItem): void;
}

const useFilterList = (tokens: TokenItem[]) => {
  const [expandDict, setExpandDict] = useState<Record<string, boolean>>({});
  const isExpand = (id: string) => {
    return expandDict[id] || false;
  };
  const setExpand = (id: string, v: boolean) => {
    setExpandDict((dict) => {
      return {
        ...dict,
        [id]: v,
      };
    });
  };

  const list = useMemo(() => {
    return Object.entries(_.groupBy(tokens, 'chain'))
      .map(([chainId, list]) => {
        const chain = getChain(chainId);
        const sum = list.reduce((t, token) => {
          return t + (token.amount * token.price || 0);
        }, 0);
        return {
          ...chain,
          serverId: chain ? chain.serverId : chainId,
          total: sum,
          isShowExpand: list.some(
            (token) => (token.amount * token.price || 0) < sum * 0.01
          ),
          tokens: isExpand(chainId)
            ? list
            : list.filter(
                (token) => (token.amount * token.price || 0) >= sum * 0.01
              ),
        };
      })
      .sort((a, b) => {
        return b.total - a.total;
      });
  }, [tokens, expandDict]);

  return {
    list,
    setExpand,
    setExpandDict,
    isExpand,
    expandDict,
  };
};

export const TokenGroupList = ({
  data,
  className,
  onTokenClick,
}: TokenGroupListProps) => {
  const fixedList = useRef<VariableSizeList>();

  const { list, isExpand, setExpand } = useFilterList(data);

  const itemSize = (index: number) => {
    const { tokens, isShowExpand } = list[index];
    return 53 * tokens.length + 38 + (isShowExpand ? 36 : 0);
  };

  useEffect(() => {
    if (className?.indexOf('fadeIn') !== -1) {
      fixedList.current?.scrollTo(0);
    }
  }, [className]);
  return (
    <div className={clsx('token-list', className)}>
      <VariableSizeList
        height={424}
        width="100%"
        itemData={list}
        itemCount={list?.length}
        estimatedItemSize={120}
        itemSize={itemSize}
        ref={fixedList}
        style={{ zIndex: 10, overflowX: 'hidden', paddingBottom: 50 }}
      >
        {({ index, style }) => {
          const item = list[index];
          return (
            <TokenGroup
              style={style}
              isShowExpand={item.isShowExpand}
              expand={isExpand(item.serverId!)}
              onExpand={(v) => {
                setExpand(item.serverId!, v);
                fixedList.current.resetAfterIndex(index);
              }}
              key={item.name}
              name={item.name}
              tokens={item.tokens}
              onTokenClick={onTokenClick}
            ></TokenGroup>
          );
        }}
      </VariableSizeList>
    </div>
  );
};
