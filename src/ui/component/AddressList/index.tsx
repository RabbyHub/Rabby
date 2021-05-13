import React, { FunctionComponent } from 'react';
import { DisplayedKeryring } from 'background/service/keyring';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE } from 'consts';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: FunctionComponent<{ data: string }>;
}
{
  [
    {
      type: 'a',
      accounts: [],
    },
  ];
}
const AddressList = ({
  list,
  action = 'switch',
  ActionButton,
}: AddressListProps) => {
  const AddressItem = ({ account }: { account: string }) => {
    return (
      <li>
        <div className="address-info">
          <span className="balance">${splitNumberByStep(1000)}</span>
          <AddressViewer
            address={account}
            showArrow={false}
            className="subtitle"
          />
        </div>
        <div className="action-button">
          <ActionButton data={account} />
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
        <p className="subtitle">{KEYRING_TYPE[name]}</p>
        <ul className="addresses">
          {group.map(({ accounts }) =>
            accounts.map((account) => <AddressItem account={account} />)
          )}
        </ul>
      </li>
    );
  };

  return (
    <ul className="address-group-list">
      {Object.keys(list).map((name) => (
        <GroupItem key={name} name={name} group={list[name]} />
      ))}
    </ul>
  );
};

export default AddressList;
