import React, { CSSProperties, useCallback, useMemo, useState } from 'react';
import { message, Skeleton, DrawerProps } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { TokenWithChain, Popup } from '@/ui/component';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { isDirectDepositToken } from '@/ui/views/Perps/constants';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from '@/ui/utils/token';
import { FixedSizeList } from 'react-window';
import { useMemoizedFn } from 'ahooks';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { useRabbySelector } from '@/ui/store';
import { findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { SvgIconCross } from '@/ui/assets';

export interface WithdrawTokenItem {
  token: TokenItem;
  balance: number;
}

interface TokenSelectPopupProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (token: TokenItem) => void;
  tokenList: TokenItem[];
  tokenListLoading: boolean;
  mode?: 'deposit' | 'withdraw';
  /**
   * Withdraw mode: items with balance to render (preferred over WITHDRAW_TOKEN_LIST).
   * Omit to fall back to chain-less legacy list.
   */
  withdrawItems?: WithdrawTokenItem[];
}

export const TokenSelectPopup: React.FC<TokenSelectPopupProps> = ({
  visible,
  onCancel,
  onSelect,
  tokenList,
  tokenListLoading,
  mode = 'deposit',
  withdrawItems,
}) => {
  const { t } = useTranslation();
  const { getContainer } = usePopupContainer();
  const wallet = useWallet();
  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  const [clickLoading, setClickLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const isWithdrawMode = mode === 'withdraw';

  const withdrawTokenList = useMemo(
    () => withdrawItems?.map((i) => i.token) ?? [],
    [withdrawItems]
  );

  const withdrawBalanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    (withdrawItems || []).forEach((i) => {
      map[i.token.id + i.token.chain] = i.balance;
    });
    return map;
  }, [withdrawItems]);

  const sortedTokenList = useMemo(() => {
    return isWithdrawMode ? withdrawTokenList : tokenList;
  }, [tokenList, isWithdrawMode, withdrawTokenList]);

  const handleClickToken = useMemoizedFn(async (token: TokenItem) => {
    if (clickLoading) return;
    try {
      if (isWithdrawMode || isDirectDepositToken(token)) {
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
      const isDisabled =
        !isWithdrawMode &&
        !supportedChains.includes(
          findChainByServerID(item.chain)?.enum || CHAINS_ENUM.ETH
        );

      return (
        <div
          key={item.id}
          style={style}
          className={clsx(
            'flex justify-between items-center h-[48px] mb-8 border border-transparent',
            'bg-r-neutral-card1 rounded-[8px] px-16',
            'text-13 font-medium text-r-neutral-title-1',
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
            <span className="text-13 text-r-neutral-title-1 font-medium">
              {getTokenSymbol(item)}
            </span>
            {isDirectDepositToken(item) && !isWithdrawMode && (
              <div className="flex items-center gap-4 text-[11px] font-medium text-r-blue-default bg-r-blue-light-1 rounded-[4px] px-6 py-2">
                <svg
                  width="8"
                  height="10"
                  viewBox="0 0 10 12"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5.833 0 0 6.667h4.167L4.167 12 10 5.333H5.833z" />
                </svg>
                {t('page.perps.directDepositFast')}
              </div>
            )}
          </div>
          {!isWithdrawMode && (
            <div className="text-13 text-r-neutral-title-1 font-medium">
              {clickLoading && loadingItem === item.id + item.chain ? (
                <RcIconLoginLoading className="w-16 h-16 animate-spin" />
              ) : (
                formatUsdValue(
                  isDirectDepositToken(item)
                    ? item.amount
                    : item.amount * item.price || 0
                )
              )}
            </div>
          )}
          {isWithdrawMode && (
            <div className="text-13 text-r-neutral-title-1 font-medium">
              {Number(
                (withdrawBalanceMap[item.id + item.chain] ?? 0).toFixed(4)
              )}
            </div>
          )}
        </div>
      );
    },
    [
      handleClickToken,
      clickLoading,
      t,
      loadingItem,
      supportedChains,
      isWithdrawMode,
      withdrawBalanceMap,
    ]
  );

  // Withdraw uses a tighter sheet so the unified height matches ChainSelectPopup.
  const popupHeight = isWithdrawMode ? 360 : 460;
  const listHeight = popupHeight - 66;

  return (
    <Popup
      visible={visible}
      onCancel={onCancel}
      height={popupHeight}
      isSupportDarkMode
      bodyStyle={{ padding: 0 }}
      destroyOnClose
      closable
      closeIcon={
        <SvgIconCross className="w-14 fill-current text-r-neutral-title-1" />
      }
      keyboard={false}
      push={false}
      getContainer={getContainer}
    >
      <div className="flex flex-col h-full pt-16 px-16 bg-r-neutral-bg2 rounded-t-[16px]">
        {/* Token Select Header */}
        <div className="text-[20px] font-medium text-r-neutral-title-1 text-center mb-16">
          {isWithdrawMode
            ? t('page.perps.selectTokenToWithdraw')
            : t('page.perps.selectTokenToDeposit')}
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
              height={listHeight}
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
