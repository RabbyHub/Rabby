import React, { FunctionComponent, useEffect, useState, memo } from 'react';
import clsx from 'clsx';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet } from 'ui/utils';
import { AddressViewer, Spin } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { HARDWARE_KEYRING_TYPES, CHAINS } from 'consts';
import { IconLedger, IconOnekey, IconTrezor } from 'ui/assets';

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

export const useCurrentBalance = (account) => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const getCurrentBalance = async () => {
    if (!account) return;
    const {
      total_usd_value,
      chain_list,
    } = await wallet.openapi.getTotalBalance(account.toLowerCase());
    setBalance(total_usd_value);
    const chainsArray = Object.values(CHAINS);
    setChainBalances(
      chain_list
        .filter((item) => item.usd_value > 0)
        .map((item) => {
          const chain = chainsArray.find(
            (chain) => chain.id === item.community_id
          );

          return {
            ...item,
            logo: chain?.logo,
            whiteLogo: chain?.whiteLogo,
          };
        })
    );
  };

  useEffect(() => {
    console.log('effect', account);
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
  const [balance, chainBalances] = useCurrentBalance(account);

  return (
    <li
      className={clsx(className, {
        disable: hiddenAddresses.find(
          (item) => item.address === account && item.type === keyring.type
        ),
      })}
      onClick={() => onClick && onClick(account, keyring)}
    >
      <div>
        <div className="address-info">
          <Spin spinning={balance === null}>
            <span className="balance">
              ${splitNumberByStep((balance || 0).toFixed(2))}
            </span>
          </Spin>
          <AddressViewer
            address={account}
            showArrow={false}
            className="subtitle"
          />
        </div>
        {!!chainBalances.length && (
          <div className="mt-4">
            {chainBalances.map((item) => (
              <img
                src={item.logo}
                className="w-16 h-16 mr-[6px] float-left"
                key={item.id}
                alt={`${item.name}: $${item.usd_value.toFixed(2)}`}
                title={`${item.name}: $${item.usd_value.toFixed(2)}`}
              />
            ))}
          </div>
        )}
      </div>
      {keyring && (
        <div className="action-button flex items-center">
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
