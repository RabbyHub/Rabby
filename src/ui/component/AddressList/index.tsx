import React from 'react';
import { DisplayedKeryring } from 'background/service/keyring';
import { KEYRING_TYPE_TEXT } from 'consts';
import AddressItem, { AddressItemProps } from './AddressItem';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: AddressItemProps['ActionButton'];
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
}

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
