import {
  BRAND_WALLET_CONNECT_TYPE,
  WALLET_BRAND_CATEGORY,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
  WALLET_SORT_SCORE,
} from 'consts';
import _ from 'lodash';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { openInternalPageInTab } from 'ui/utils/webapi';
import { useWallet } from '@/ui/utils';
import { UI_TYPE } from '@/constant/ui';

export interface AddAddressNavigateHandler {
  (type: string, state?: Record<string, any>): void;
}

interface WalletRouteParams {
  address: string;
  chainId: number;
  // Only set when this flow started from a pending ImportAddress approval, so /popup/import/success can complete it.
  approvalId?: string;
}

export interface WalletBrandItem {
  leftIcon: string;
  content: string;
  brand: string;
  connectType: string;
  image: string;
  onClick: () => void;
  category: string;
  preventClick?: boolean;
  tipI18nKey?: string;
}

const isDesktop = UI_TYPE.isDesktop;
const getSortNum = (brand: string) => WALLET_SORT_SCORE[brand] || 999999;

type ValueOf<T> = T[keyof T];

export const useAddAddressWalletOptions = ({
  onNavigate,
  params,
}: {
  onNavigate?: AddAddressNavigateHandler;
  // Forwarded into brandWallets' manual click handlers so a bound approvalId survives a manual pick, not just the auto redirect.
  params?: Pick<WalletRouteParams, 'approvalId'>;
} = {}) => {
  const history = useHistory();
  const wallet = useWallet();

  const handleRouter = React.useCallback(
    async (action: (h: typeof history) => void) =>
      (await wallet.isBooted())
        ? action(history)
        : history.push({
            pathname: '/password',
            state: {
              handle: (h: typeof history) => action(h),
            },
          }),
    [history, wallet]
  );

  const connectRouter = React.useCallback(
    (
      item: ValueOf<typeof WALLET_BRAND_CONTENT>,
      params?: Partial<WalletRouteParams>
    ) =>
      handleRouter((currentHistory) => {
        // Single place that forwards `params` into history.push/onNavigate, so no
        // branch can silently drop it building its own payload (desktop's own
        // AddAddressModal still doesn't read this state for Cobo Argus/Gnosis/Coinbase — separate gap).
        const go = (
          type: string,
          pathname: string,
          extra?: Record<string, any>
        ) => {
          const state = { ...params, ...extra };
          if (isDesktop) {
            onNavigate?.(type, state);
          } else {
            currentHistory.push({ pathname, state });
          }
        };

        if (item.connectType === 'BitBox02Connect') {
          openInternalPageInTab('import/hardware?connectType=BITBOX02');
        } else if (item.connectType === 'GridPlusConnect') {
          openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
        } else if (item.connectType === 'TrezorConnect') {
          openInternalPageInTab('import/hardware/trezor-connect');
        } else if (item.connectType === 'LedgerConnect') {
          openInternalPageInTab('import/hardware/ledger-connect');
        } else if (item.connectType === 'OneKeyConnect') {
          openInternalPageInTab('import/hardware/onekey-connect');
        } else if (item.connectType === 'GnosisConnect') {
          go('gnosis', '/import/gnosis');
        } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.QRCodeBase) {
          if (item.brand === WALLET_BRAND_TYPES.KEYSTONE) {
            openInternalPageInTab('import/hardware/keystone');
            return;
          }
          if (item.brand === WALLET_BRAND_TYPES.ONEKEY) {
            openInternalPageInTab('import/hardware/onekey');
            return;
          }
          openInternalPageInTab(`import/hardware/qrcode?brand=${item.brand}`);
        } else if (
          item.connectType === BRAND_WALLET_CONNECT_TYPE.CoboArgusConnect
        ) {
          go('cobo-argus', '/import/cobo-argus');
        } else if (
          item.connectType === BRAND_WALLET_CONNECT_TYPE.CoinbaseConnect
        ) {
          go('coinbase', '/import/coinbase');
        } else if (
          item.connectType === BRAND_WALLET_CONNECT_TYPE.ImKeyConnect
        ) {
          openInternalPageInTab('import/hardware/imkey-connect');
        } else {
          go('wallet-connect', '/import/wallet-connect', { brand: item });
        }
      }),
    [handleRouter, onNavigate]
  );

  const brandWallets = React.useMemo(
    () =>
      (Object.values(WALLET_BRAND_CONTENT)
        .map((item) => {
          if (item.hidden) {
            return null;
          }
          return {
            leftIcon: item.leftIcon || item.image,
            content: item.name,
            brand: item.brand,
            connectType: item.connectType,
            image: item.image,
            onClick: () => {
              if (item.preventClick) {
                return;
              }
              connectRouter(item, params);
            },
            category: item.category,
            preventClick: item.preventClick,
            tipI18nKey: item.tipI18nKey,
          } as WalletBrandItem;
        })
        .filter(Boolean) as WalletBrandItem[]).sort(
        (a, b) => getSortNum(a.brand) - getSortNum(b.brand)
      ),
    [connectRouter, params?.approvalId]
  );

  const groupedWallets = React.useMemo(
    () => _.groupBy(brandWallets, 'category'),
    [brandWallets]
  );

  return {
    connectRouter,
    hardwareWallets: groupedWallets[WALLET_BRAND_CATEGORY.HARDWARE] || [],
    mobileWallets: groupedWallets[WALLET_BRAND_CATEGORY.MOBILE] || [],
    institutionalWallets:
      groupedWallets[WALLET_BRAND_CATEGORY.INSTITUTIONAL] || [],
  };
};
