import React, { FunctionComponent } from 'react';
import { DisplayedKeryring } from 'background/service/keyring';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE } from 'consts';
import './style.less';

interface AddressListProps {
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: FunctionComponent<{ data: string }>;
}

const AddressItem = ({
  account,
  ActionButton,
  className,
}: {
  account: string;
  ActionButton?: AddressListProps['ActionButton'];
  className?: string;
}) => {
  return (
    <li className={className}>
      <div className="address-info">
        <span className="balance">${splitNumberByStep(1000)}</span>
        <AddressViewer
          address={account}
          showArrow={false}
          className="subtitle"
        />
      </div>
      {ActionButton && (
        <div className="action-button">
          <ActionButton data={account} />
        </div>
      )}
    </li>
  );
};

interface CompoundedComponent
  extends React.FunctionComponent<AddressListProps> {
  AddressItem: typeof AddressItem;
}

const AddressList: CompoundedComponent = ({ list, ActionButton }) => {
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
            accounts.map((account) => (
              <AddressItem
                key={account}
                account={account}
                ActionButton={ActionButton}
              />
            ))
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

AddressList.AddressItem = AddressItem;

export default AddressList;
