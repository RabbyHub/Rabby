import {
  BRAND_WALLET_CONNECT_TYPE,
  WALLET_BRAND_CATEGORY,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
  WALLET_SORT_SCORE,
} from 'consts';
import _ from 'lodash';
import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { useHistory } from 'react-router-dom';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
import { Item } from '@/ui/component';
import { useWallet } from '@/ui/utils';
import { UI_TYPE } from '@/constant/ui';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export interface AddAddressNavigateHandler {
  (type: string, state?: Record<string, any>): void;
}

interface WalletRouteParams {
  address: string;
  chainId: number;
  // Set only when this "add address" flow was entered from a pending
  // ImportAddress approval (see Approval/components/ImportAddress.tsx) — carried
  // through same-window route state so the eventual /popup/import/success screen
  // can complete that approval. Not set for a plain, user-initiated add-address
  // flow, which must not settle any approval.
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

const AddressItem = ({ data }: { data: WalletBrandItem }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const leftNode = (
    <div className="relative w-[29px] h-[28px]">
      <img src={data.image} className="w-[28px] h-[28px]" />
      {data.connectType === 'WalletConnect' &&
        data.brand !== WALLET_BRAND_TYPES.WALLETCONNECT && (
          <img
            src={IconWalletConnect}
            className="absolute -bottom-6 -right-6 w-[14px] h-[14px] rounded-full"
          />
        )}
    </div>
  );

  return (
    <Item
      bgColor="transparent"
      className={clsx('flex-col justify-center hover:border-transparent', {
        'cursor-not-allowed': data.preventClick,
      })}
      hoverBgColor={data.preventClick ? '' : undefined}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      py={10}
      px={0}
      left={
        <Tooltip
          title={data.tipI18nKey ? t(data.tipI18nKey) : undefined}
          placement="topLeft"
          visible={!!data.tipI18nKey && visible}
          arrowPointAtCenter
          overlayClassName="rectangle w-[max-content] max-w-[355px]"
        >
          {leftNode}
        </Tooltip>
      }
      rightIcon={null}
      onClick={data.onClick}
    >
      <span className="text-12 font-medium text-r-neutral-title-1 mt-[8px]">
        {data.content}
      </span>
    </Item>
  );
};

export const WalletBrandGrid = ({
  wallets,
  className,
}: {
  wallets: WalletBrandItem[];
  className?: string;
}) => {
  if (!wallets.length) {
    return null;
  }

  return (
    <div
      className={clsx('mx-[16px] bg-r-neutral-card-2 rounded-[6px]', className)}
    >
      <div className="py-[8px] grid grid-cols-3 gap-x-0">
        {wallets.map((wallet) => (
          <AddressItem key={wallet.brand} data={wallet} />
        ))}
      </div>
    </div>
  );
};

export const useAddAddressWalletOptions = ({
  onNavigate,
  params,
}: {
  onNavigate?: AddAddressNavigateHandler;
  // Ambient params (currently only approvalId matters here) for brandWallets'
  // manual click handlers — the caller's own incoming route state, if any, so
  // an approval bound at a screen further up the chain isn't lost when the
  // user picks a wallet from this screen instead of hitting the automatic
  // brand-match redirect.
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
        // Single place that actually forwards `params` (address/chainId/
        // approvalId) into a same-window destination, for both the popup/tab
        // (history.push) and desktop (onNavigate) transports — every branch
        // below calls this instead of hand-building its own payload, so a new
        // branch (or an existing one) can't silently drop params by omission
        // the way the desktop Cobo Argus/Coinbase branches previously did.
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
