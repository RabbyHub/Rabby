import React, { FunctionComponent, useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet, useWalletRequest } from 'ui/utils';
import { AddressViewer, Spin } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { HARDWARE_KEYRING_TYPES, CHAINS } from 'consts';
import { IconLedger, IconOnekey, IconTrezor } from 'ui/assets';
import IconEmptyChain from 'ui/assets/chain-logos/empty.svg';

interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
  whiteLogo?: string;
}

export interface AddressItemProps {
  account: string;
  keyring?: any;
  ActionButton?: FunctionComponent<{ data: string; keyring: any }>;
  className?: string;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
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

export const useCurrentBalance = (account: string | undefined) => {
  const wallet = useWallet();
  const cache = wallet.getAddressCacheBalance(account);
  const [balance, setBalance] = useState<number | null>(
    cache ? cache.total_usd_value : null
  );
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >(
    cache
      ? cache.chain_list.filter((item) => item.usd_value > 0).map(formatChain)
      : []
  );

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
    if (!account) return;
    const cacheData = wallet.getAddressCacheBalance(account);
    if (cacheData) {
      setBalance(cacheData.total_usd_value);
    }
    getAddressBalance(account.toLowerCase());
  };

  useEffect(() => {
    getCurrentBalance();
  }, [account]);

  return [balance, chainBalances] as const;
};

const AddressItem = ({
  account,
  keyring,
  ActionButton,
  hiddenAddresses = [],
  className,
  onClick,
}: AddressItemProps) => {
  if (!account) {
    return null;
  }
  const [balance, chainBalances] = useCurrentBalance(account);

  const isDisabled = hiddenAddresses.find(
    (item) => item.address === account && item.type === keyring.type
  );
  return (
    <li
      className={className}
      onClick={() => onClick && onClick(account, keyring)}
    >
      <div
        className={clsx(
          'flex items-center flex-wrap',
          isDisabled && 'opacity-40'
        )}
      >
        <div className="address-info">
          <span className="balance">
            {balance === null ? (
              <Skeleton.Input active style={{ width: 30 }} />
            ) : (
              `$${splitNumberByStep((balance || 0).toFixed(2))}`
            )}
          </span>
          <AddressViewer
            address={account}
            showArrow={false}
            className="subtitle"
          />
        </div>

        <div className="mt-4 flex w-full">
          {chainBalances.length ? (
            chainBalances.map((item) => (
              <img
                src={item.logo}
                className="w-16 h-16 mr-6"
                key={item.id}
                alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
                title={`${item.name}: $${item.usd_value.toFixed(2)}`}
              />
            ))
          ) : (
            <img src={IconEmptyChain} />
          )}
        </div>
      </div>
      {keyring && (
        <div className="action-button flex items-center flex-shrink-0">
          {Object.keys(HARDWARE_KEYRING_TYPES)
            .map((key) => HARDWARE_KEYRING_TYPES[key].type)
            .includes(keyring.type) && (
            <img src={HARDWARES[keyring.type]} className="icon icon-hardware" />
          )}
          {ActionButton && <ActionButton data={account} keyring={keyring} />}
        </div>
      )}
    </li>
  );
};

export default AddressItem;
