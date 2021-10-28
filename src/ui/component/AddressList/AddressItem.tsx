import React, {
  FunctionComponent,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet, useWalletRequest } from 'ui/utils';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import {
  HARDWARE_KEYRING_TYPES,
  CHAINS,
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
} from 'consts';
import { IconLedger, IconOnekey, IconTrezor } from 'ui/assets';
import IconEmptyChain from 'ui/assets/chain-logos/empty.svg';

interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

export interface AddressItemProps {
  account: {
    address: string;
    type: string;
    brandName: string;
  };
  keyring?: any;
  ActionButton?: FunctionComponent<{ data: string; keyring: any }>;
  className?: string;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any, brandName: string): void;
  showAssets?: boolean;
  noNeedBalance?: boolean;
  currentAccount?: any;
  icon?: string;
}

const HARDWARES = {
  [HARDWARE_KEYRING_TYPES.Ledger.type]: IconLedger,
  [HARDWARE_KEYRING_TYPES.Trezor.type]: IconTrezor,
  [HARDWARE_KEYRING_TYPES.Onekey.type]: IconOnekey,
};

const formatChain = (item: ChainWithBalance): DisplayChainWithWhiteLogo => {
  const chainsArray = Object.values(CHAINS);
  const chain = chainsArray.find((chain) => chain.id === item.community_id);

  return {
    ...item,
    logo: chain?.logo || item.logo_url,
    whiteLogo: chain?.whiteLogo,
  };
};

export const useCurrentBalance = (
  account: string | undefined,
  update = false,
  noNeedBalance = false
) => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const [getAddressBalance] = useWalletRequest(wallet.getAddressBalance, {
    onSuccess({ total_usd_value, chain_list }) {
      setBalance(total_usd_value);
      setChainBalances(
        chain_list.filter((item) => item.usd_value > 0).map(formatChain)
      );
    },
    onError() {
      setBalance(NaN);
    },
  });

  const getCurrentBalance = async () => {
    if (!account || noNeedBalance) return;
    const cacheData = await wallet.getAddressCacheBalance(account);
    if (cacheData) {
      setBalance(cacheData.total_usd_value);
      if (update) {
        getAddressBalance(account.toLowerCase());
      }
    } else {
      getAddressBalance(account.toLowerCase());
    }
  };

  useEffect(() => {
    getCurrentBalance();
    if (!noNeedBalance) {
      wallet.getAddressCacheBalance(account).then((cache) => {
        setChainBalances(
          cache
            ? cache.chain_list
                .filter((item) => item.usd_value > 0)
                .map(formatChain)
            : []
        );
      });
    }
  }, [account]);

  return [balance, chainBalances, getAddressBalance] as const;
};
const AddressItem = memo(
  forwardRef(
    (
      {
        account,
        keyring,
        ActionButton,
        hiddenAddresses = [],
        className,
        showAssets,
        onClick,
        noNeedBalance = false,
        currentAccount = null,
        icon = '',
      }: AddressItemProps,
      ref
    ) => {
      if (!account) {
        return null;
      }
      const [isLoading, setIsLoading] = useState(false);
      const [balance, chainBalances, getAddressBalance] = useCurrentBalance(
        account.address,
        false,
        noNeedBalance
      );

      const updateBalance = async () => {
        setIsLoading(true);
        await getAddressBalance(account.address.toLowerCase());
        setIsLoading(false);
      };

      useImperativeHandle(ref, () => ({
        updateBalance,
      }));
      const isDisabled = hiddenAddresses.find(
        (item) => item.address === account.address && item.type === keyring.type
      );
      const isCurrentAddress =
        currentAccount?.address === account.address &&
        currentAccount?.type === account.type;
      return (
        <li
          className={clsx(
            className,
            { 'no-assets': !showAssets },
            isCurrentAddress && 'highlight-address'
          )}
          onClick={() =>
            onClick && onClick(account.address, keyring, account.brandName)
          }
        >
          <div
            className={clsx(
              'flex items-center flex-wrap relative',
              isDisabled && 'opacity-40'
            )}
          >
            <div className="address-info">
              {showAssets && (
                <span className="balance">
                  {isLoading && <Skeleton.Input active />}
                  <span style={{ opacity: isLoading ? 0 : 1 }}>
                    ${splitNumberByStep((balance || 0).toFixed(2))}
                  </span>
                </span>
              )}
              <AddressViewer
                address={account.address}
                showArrow={false}
                className="subtitle"
              />
            </div>

            {showAssets && (
              <div className="mt-4 w-full text-left leading-none">
                <div className="inline-flex relative">
                  {chainBalances.length ? (
                    chainBalances.map((item) => (
                      <img
                        src={item.logo}
                        className="w-16 h-16 mr-6"
                        key={item.id}
                        alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
                        title={`${item.name}: $${item.usd_value.toFixed(2)}`}
                        style={{ opacity: isLoading ? 0 : 1 }}
                      />
                    ))
                  ) : (
                    <img
                      className="w-16 h-16"
                      src={IconEmptyChain}
                      style={{ opacity: isLoading ? 0 : 1 }}
                    />
                  )}
                  {isLoading && <Skeleton.Input active />}
                </div>
              </div>
            )}
            {icon && <img src={icon} className="item-right-icon" />}
          </div>
          {keyring && (
            <div className="action-button flex items-center flex-shrink-0">
              <img
                src={
                  KEYRING_ICONS[account.type] ||
                  WALLET_BRAND_CONTENT[account.brandName]
                }
                className="icon icon-hardware"
              />
              {ActionButton && (
                <ActionButton data={account.address} keyring={keyring} />
              )}
            </div>
          )}
        </li>
      );
    }
  )
);

export default AddressItem;
