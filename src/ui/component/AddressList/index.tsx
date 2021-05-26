import React, { FunctionComponent, useEffect, useState } from 'react';
import clsx from 'clsx';
import { DisplayedKeryring } from 'background/service/keyring';
import { ChainWithBalance } from 'background/service/openapi';
import { useWallet } from 'ui/utils';
import { AddressViewer, Spin } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE_TEXT, HARDWARE_KEYRING_TYPES, CHAINS } from 'consts';
import IconTrezor from 'ui/assets/icon-trezor.svg';
import IconLedger from 'ui/assets/icon-ledger.svg';
import IconOnekey from 'ui/assets/icon-onekey.svg';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: FunctionComponent<{ data: string; keyring: any }>;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
}

interface DisplayChainWithWhiteLogo extends ChainWithBalance {
  logo?: string;
}

const AddressItem = ({
  account,
  keyring,
  ActionButton,
  hiddenAddresses = [],
  className,
  onClick,
}: {
  account: string;
  keyring?: any;
  ActionButton?: AddressListProps['ActionButton'];
  className?: string;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
}) => {
  const wallet = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [chainBalances, setChainBalances] = useState<
    DisplayChainWithWhiteLogo[]
  >([]);

  const HardwareIcon = () => {
    switch (keyring.type) {
      case HARDWARE_KEYRING_TYPES.Ledger.type:
        return <img src={IconLedger} className="icon icon-hardware" />;
      case HARDWARE_KEYRING_TYPES.Trezor.type:
        return <img src={IconTrezor} className="icon icon-hardware" />;
      case HARDWARE_KEYRING_TYPES.Onekey.type:
        return <img src={IconOnekey} className="icon icon-onekey" />;
      default:
        return <></>;
    }
  };

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
        .map((item) => ({
          ...item,
          logo: chainsArray.find((chain) => chain.serverId === item.id)?.logo,
        }))
    );
  };

  useEffect(() => {
    getCurrentBalance();
  }, [account]);

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
            .includes(keyring.type) && <HardwareIcon />}
          {ActionButton && <ActionButton data={account} keyring={keyring} />}
        </div>
      )}
    </li>
  );
};

interface CompoundedComponent
  extends React.FunctionComponent<AddressListProps> {
  AddressItem: typeof AddressItem;
}

const AddressList: CompoundedComponent = ({
  list,
  action = 'switch',
  ActionButton,
  onClick,
  hiddenAddresses = [],
}: AddressListProps) => {
  const GroupItem = ({
    group,
    name,
  }: {
    name: string;
    group: DisplayedKeryring[];
  }) => {
    return (
      <li>
        <p className="subtitle">{KEYRING_TYPE_TEXT[name]}</p>
        <ul className="addresses">
          {group.map(({ accounts, keyring }) =>
            accounts.map((account) => (
              <AddressItem
                key={account}
                account={account}
                keyring={keyring}
                ActionButton={ActionButton}
                onClick={onClick}
                hiddenAddresses={hiddenAddresses}
              />
            ))
          )}
        </ul>
      </li>
    );
  };

  return (
    <ul className={`address-group-list ${action}`}>
      {Object.keys(list).map((name) => (
        <GroupItem key={name} name={name} group={list[name]} />
      ))}
    </ul>
  );
};

AddressList.AddressItem = AddressItem;

export default AddressList;
