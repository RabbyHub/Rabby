import React, { FunctionComponent } from 'react';
import clsx from 'clsx';
import { DisplayedKeryring } from 'background/service/keyring';
import { AddressViewer } from 'ui/component';
import { splitNumberByStep } from 'ui/utils/number';
import { KEYRING_TYPE_TEXT, HARDWARE_KEYRING_TYPES } from 'consts';
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
  return (
    <li
      className={clsx(className, {
        disable: hiddenAddresses.find(
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
