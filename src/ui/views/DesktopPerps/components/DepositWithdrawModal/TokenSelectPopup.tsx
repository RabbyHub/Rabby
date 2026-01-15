import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import { message, Skeleton, DrawerProps } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TokenWithChain, Popup } from '@/ui/component';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { formatUsdValue, useWallet } from '@/ui/utils';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
} from '@/ui/views/Perps/constants';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from '@/ui/utils/token';
import { FixedSizeList } from 'react-window';
import { useMemoizedFn } from 'ahooks';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { useRabbySelector } from '@/ui/store';
import { findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { SvgIconCross } from '@/ui/assets';

interface TokenSelectPopupProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (token: TokenItem) => void;
  tokenList: TokenItem[];
  tokenListLoading: boolean;
}

export const TokenSelectPopup: React.FC<TokenSelectPopupProps> = ({
  visible,
  onCancel,
  onSelect,
  tokenList,
  tokenListLoading,
}) => {
  const { t } = useTranslation();
  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  const { getContainer } = usePopupContainer();
  const wallet = useWallet();
  const [clickLoading, setClickLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const sortedTokenList = useMemo(() => {
    const items = [...(tokenList || [])];

    // Sort by amount * price (descending)
    items.sort((a, b) => {
      const aValue = b.amount * b.price;
      const bValue = a.amount * a.price;

      // Check if tokens are in supported chains
      const aChain = findChainByServerID(a.chain)?.enum || CHAINS_ENUM.ETH;
      const bChain = findChainByServerID(b.chain)?.enum || CHAINS_ENUM.ETH;
      const aIsSupported = supportedChains.includes(aChain);
      const bIsSupported = supportedChains.includes(bChain);

      // Supported chains first, then by value
      if (aIsSupported && !bIsSupported) return -1;
      if (!aIsSupported && bIsSupported) return 1;

      // Both supported or both not supported, sort by value
      return aValue - bValue;
    });

    // Move ARB USDC to the front if it exists
    const idx = items.findIndex(
      (token) =>
        token.id === ARB_USDC_TOKEN_ID &&
        token.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    if (idx > 0) {
      const [hit] = items.splice(idx, 1);
      items.unshift(hit);
    } else if (idx === -1) {
      items.unshift(ARB_USDC_TOKEN_ITEM);
    }
    return items;
  }, [tokenList, supportedChains]);

  const handleClickToken = useMemoizedFn(async (token: TokenItem) => {
    if (clickLoading) return;
    try {
      if (
        token.id === ARB_USDC_TOKEN_ID &&
        token.chain === ARB_USDC_TOKEN_SERVER_CHAIN
      ) {
        // direct deposit
        onSelect(token);
        return;
      }

      setClickLoading(true);
      setLoadingItem(token.id + token.chain);
      const res = await wallet.openapi.getPerpsBridgeIsSupportToken({
        token_id: token.id,
        chain_id: token.chain,
      });
      if (res?.success) {
        // bridge token with liFi dex
        onSelect(token);
        setClickLoading(false);
        setLoadingItem(null);
        return;
      } else {
        message.error('not supported token, try other token');
      }
      setClickLoading(false);
      setLoadingItem(null);
    } catch (error) {
      console.error('deposit handleClickToken error', error);
      setClickLoading(false);
      setLoadingItem(null);
    }
  });

  const TokenRow = useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: TokenItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];
      const isDisabled = !supportedChains.includes(
        findChainByServerID(item.chain)?.enum || CHAINS_ENUM.ETH
      );

      return (
        <div
          key={item.id}
          style={style}
          className={clsx(
            'flex justify-between items-center h-[48px] mb-8 border border-transparent',
            'bg-r-neutral-card1 rounded-[8px] px-16',
            'text-13 font-medium text-rb-neutral-title-1',
            isDisabled
              ? 'opacity-50'
              : 'cursor-pointer hover:border-rabby-blue-default hover:bg-r-blue-light-1'
          )}
          onClick={() => {
            if (isDisabled) return;
            handleClickToken(item);
          }}
        >
          <div className="flex items-center gap-12">
            <TokenWithChain token={item} hideConer width="24px" height="24px" />
            <span className="text-13 text-rb-neutral-title-1 font-medium">
              {getTokenSymbol(item)}
            </span>
            {item.id === ARB_USDC_TOKEN_ID &&
              item.chain === ARB_USDC_TOKEN_SERVER_CHAIN && (
                <div className="text-12 font-medium text-r-blue-default bg-r-blue-light-1 rounded-[4px] px-6 py-2">
                  {t('page.perps.directDeposit')}
                </div>
              )}
          </div>
          <div className="text-13 text-rb-neutral-title-1 font-medium">
            {clickLoading && loadingItem === item.id + item.chain ? (
              <RcIconLoginLoading className="w-16 h-16 animate-spin" />
            ) : (
              formatUsdValue(item.amount * item.price || 0)
            )}
          </div>
        </div>
      );
    },
    [handleClickToken, clickLoading, t, loadingItem]
  );

  return (
    <Popup
      visible={visible}
      onCancel={onCancel}
      height={460}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      closable
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-rb-neutral-title-1" />
      }
      keyboard={false}
      push={false}
      getContainer={getContainer}
    >
      <div className="flex flex-col h-full pt-16 px-16 bg-r-neutral-bg2 rounded-t-[16px]">
        {/* Token Select Header */}
        <div className="text-[20px] font-medium text-rb-neutral-title-1 text-center mb-16">
          {t('page.perps.selectTokenToDeposit')}
        </div>

        {/* Token List */}
        <div className="overflow-y-auto flex-1 relative">
          {tokenListLoading ? (
            <div className="flex flex-col items-center h-full w-full">
              {new Array(7).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center h-[48px] mb-8 border border-transparent bg-r-neutral-card-1 rounded-[8px] px-16 w-full"
                >
                  <div className="flex items-center gap-12">
                    <Skeleton.Avatar active={true} size={24} shape="circle" />
                    <Skeleton.Button
                      active={true}
                      className="h-[16px] block rounded-[8px]"
                      style={{ width: 80 }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 items-end">
                    <Skeleton.Button
                      active={true}
                      className="h-[16px] block rounded-[8px]"
                      style={{ width: 80 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FixedSizeList
              width={'100%'}
              height={394}
              itemCount={sortedTokenList?.length || 0}
              itemData={sortedTokenList}
              itemSize={56}
              className="trades-container-no-scrollbar"
            >
              {TokenRow}
            </FixedSizeList>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default TokenSelectPopup;
