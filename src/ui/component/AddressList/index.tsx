import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import { DisplayedKeryring } from 'background/service/keyring';
import { KEYRING_TYPE } from 'consts';
import AddressItem, { AddressItemProps } from './AddressItem';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: DisplayedKeryring[];
  ActionButton: AddressItemProps['ActionButton'];
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any, brandName: string): void;
  currentAccount?: any;
}

const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5,
};

const AddressList: any = forwardRef(
  (
    {
      list,
      action = 'switch',
      ActionButton,
      onClick,
      hiddenAddresses = [],
      currentAccount,
    }: AddressListProps,
    ref
  ) => {
    const addressItems = useRef(new Array(list.length));

    const updateAllBalance = () => {
      const q: Promise<void>[] = [];
      addressItems.current.forEach((item) => {
        item.updateBalance();
      });
      return Promise.all(q);
    };

    useImperativeHandle(ref, () => ({
      updateAllBalance,
    }));

    return (
      <ul className={`address-group-list ${action}`}>
        {list
          .sort((a, b) => {
            return SORT_WEIGHT[a.type] - SORT_WEIGHT[b.type];
          })
          .map((group, index) => (
            <li key={index}>
              <ul className="addresses">
                {group.accounts.map((account) => (
                  <AddressItem
                    key={`${index}-${account.address}`}
                    account={{ ...account, type: group.type }}
                    keyring={group.keyring}
                    ActionButton={ActionButton}
                    onClick={onClick}
                    hiddenAddresses={hiddenAddresses}
                    currentAccount={currentAccount}
                    showAssets
                    ref={(el) => {
                      addressItems.current[index] = el;
                    }}
                  />
                ))}
              </ul>
            </li>
          ))}
      </ul>
    );
  }
);

AddressList.AddressItem = AddressItem;

export default AddressList;
