import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TokenItem } from '@/background/service/openapi';
import type { RemovedToken } from '@/background/service/removedTokens';
import { Popup } from '@/ui/component';
import TokenWithChain from '@/ui/component/TokenWithChain';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRemovedTokens } from '@/ui/hooks/useRemovedTokens';
import { getContainerByScreen, useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { ellipsisAddress } from '@/ui/utils/address';
import { getRemovedTokenKey } from '@/utils/removedTokens';
import { ReactComponent as RcIconBack } from '@/ui/assets/icon-back-cc.svg';
import { TokenDetailPopup } from '../../TokenDetailPopup';

const TOKEN_INFO_BATCH_SIZE = 50;

/** Keeps the saved identity usable in token detail when metadata is unavailable. */
const createFallbackToken = (token: RemovedToken): TokenItem => ({
  id: token.tokenId,
  chain: token.chain.toLowerCase(),
  symbol: ellipsisAddress(token.tokenId),
  display_symbol: null,
  optimized_symbol: '',
  logo_url: '',
  name: '',
  amount: 0,
  price: 0,
  decimals: 0,
  time_at: 0,
  is_core: null,
  is_verified: null,
  is_wallet: false,
});

type TokenInfoCache = {
  address: string | undefined;
  tokens: Map<string, TokenItem>;
};

/** Loads removed-token metadata in batches and opens the existing token detail. */
export const RemovedTokenPopup = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (token: TokenItem) => void;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const address = useCurrentAccount()?.address;
  const removedTokens = useRemovedTokens((state) => state.removedTokens);
  const [tokenInfo, setTokenInfo] = useState<TokenInfoCache>(() => ({
    address,
    tokens: new Map(),
  }));
  const tokenInfoCache = useRef(tokenInfo);
  const [failedKeys, setFailedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (tokenInfoCache.current.address !== address) {
      tokenInfoCache.current = { address, tokens: new Map() };
      setTokenInfo(tokenInfoCache.current);
    }
    setFailedKeys(new Set());
    if (!address) return;
    let cancelled = false;
    const tokensToLoad = removedTokens.filter(
      (token) => !tokenInfoCache.current.tokens.has(getRemovedTokenKey(token))
    );

    const loadTokenInfo = async () => {
      for (
        let offset = 0;
        offset < tokensToLoad.length;
        offset += TOKEN_INFO_BATCH_SIZE
      ) {
        if (cancelled) return;
        const batch = tokensToLoad.slice(
          offset,
          offset + TOKEN_INFO_BATCH_SIZE
        );
        try {
          const tokens = await wallet.openapi.customListToken(
            batch.map(
              (token) => `${token.chain.toLowerCase()}:${token.tokenId}`
            ),
            address
          );
          if (cancelled) return;
          const resolved = new Map<string, TokenItem>(
            tokens.map((token) => [
              getRemovedTokenKey({ tokenId: token.id, chain: token.chain }),
              token,
            ])
          );
          tokenInfoCache.current = {
            address,
            tokens: new Map([...tokenInfoCache.current.tokens, ...resolved]),
          };
          setTokenInfo(tokenInfoCache.current);
          setFailedKeys((previous) => {
            const next = new Set(previous);
            batch.forEach((token) => {
              const key = getRemovedTokenKey(token);
              if (!resolved.has(key)) next.add(key);
            });
            return next;
          });
        } catch (error) {
          if (cancelled) return;
          console.error('Load removed token info failed:', error);
          setFailedKeys(
            (previous) =>
              new Set([...previous, ...batch.map(getRemovedTokenKey)])
          );
        }
      }
    };
    loadTokenInfo();
    return () => {
      cancelled = true;
    };
  }, [address, removedTokens, wallet]);

  return (
    <Popup
      visible
      height="auto"
      push={false}
      isNew
      isSupportDarkMode
      onClose={onClose}
      getContainer={getContainerByScreen}
      bodyStyle={{ padding: 0 }}
      contentWrapperStyle={{ maxHeight: 500 }}
    >
      <div className="flex max-h-[500px] flex-col overflow-hidden">
        <div className="relative h-60 shrink-0 flex items-center justify-center">
          <button
            type="button"
            className="absolute left-20 top-18 text-r-neutral-title-1"
            aria-label={t('global.Cancel')}
            onClick={onClose}
          >
            <RcIconBack />
          </button>
          <span className="text-20 font-medium leading-24 text-r-neutral-title-1">
            {t('page.dashboard.settings.removedToken.title')}
          </span>
        </div>
        <div className="min-h-0 overflow-y-auto px-20 pt-8 pb-32">
          <p className="m-0 mb-16 text-14 font-medium leading-18 text-r-neutral-body">
            {t('page.dashboard.settings.removedToken.description')}
          </p>
          <div className="flex flex-col gap-16">
            {removedTokens.map((item) => {
              const key = getRemovedTokenKey(item);
              const token =
                tokenInfo.address === address
                  ? tokenInfo.tokens.get(key)
                  : undefined;
              if (!token && !failedKeys.has(key)) {
                return (
                  <div
                    key={key}
                    aria-busy="true"
                    className="h-60 shrink-0 rounded-[8px] bg-r-neutral-bg-4"
                  />
                );
              }
              const displayToken = token || createFallbackToken(item);
              return (
                <button
                  key={key}
                  type="button"
                  className="flex h-60 shrink-0 items-center gap-10 rounded-[8px] border border-transparent bg-r-neutral-card-1 px-12 text-left hover:border-r-blue-default active:border-r-blue-default active:bg-r-blue-light-1"
                  onClick={() => onSelect(displayToken)}
                >
                  <TokenWithChain
                    token={displayToken}
                    width="32px"
                    height="32px"
                    chainSize={16}
                    className="shrink-0"
                  />
                  <span
                    className="truncate text-15 font-medium leading-18 text-r-neutral-title-1"
                    title={!token ? item.tokenId : undefined}
                  >
                    {getTokenSymbol(displayToken) || item.tokenId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Popup>
  );
};

/** Owns the removed-token settings count and navigation between its popups. */
export const useRemovedTokenPopup = () => {
  const removedTokenCount = useRemovedTokens(
    (state) => state.removedTokens.length
  );
  const [visible, setVisible] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);

  useEffect(() => {
    if (!removedTokenCount) {
      setVisible(false);
    }
  }, [removedTokenCount]);

  return {
    removedTokenCount,
    openRemovedTokenPopup: () => setVisible(true),
    removedTokenPopup: (
      <>
        {visible && (
          <RemovedTokenPopup
            onClose={() => setVisible(false)}
            onSelect={(token) => {
              setSelectedToken(token);
            }}
          />
        )}
        <TokenDetailPopup
          token={selectedToken}
          visible={!!selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      </>
    ),
  };
};
