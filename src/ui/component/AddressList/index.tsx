import React, { FunctionComponent } from 'react';
import clsx from 'clsx';
import { DisplayedKeryring } from 'background/service/keyring';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE_TEXT } from 'consts';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: FunctionComponent<{ data: string; keyring: any }>;
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
}

const AddressList = ({
  list,
  action = 'switch',
  ActionButton,
  onClick,
  hiddenAddresses = [],
}: AddressListProps) => {
  const AddressItem = ({
    account,
    keyring,
  }: {
    account: string;
    keyring: any;
  }) => {
    return (
      <li
        className={clsx({
          hidden: hiddenAddresses.find(
            (item) => item.address === account && item.type === keyring.type
          ),
        })}
        onClick={() => onClick && onClick(account, keyring)}
      >
        <div className="address-info">
          <span className="balance">${splitNumberByStep(1000)}</span>
          <AddressViewer
            address={account}
            showArrow={false}
            className="subtitle"
          />
        </div>
        <div className="action-button flex items-center">
          <ActionButton data={account} keyring={keyring} />
        </div>
      </li>
    );
  };
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
              <AddressItem key={account} account={account} keyring={keyring} />
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

export default AddressList;
