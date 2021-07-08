import React from 'react';
import { useTranslation } from 'react-i18next';
import { DisplayedKeryring } from 'background/service/keyring';
import { KEYRING_TYPE, KEYRING_TYPE_TEXT } from 'consts';
import AddressItem, { AddressItemProps } from './AddressItem';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import './style.less';

type ACTION = 'management' | 'switch';

interface AddressListProps {
  action?: ACTION;
  list: Record<string, DisplayedKeryring[]>;
  ActionButton: AddressItemProps['ActionButton'];
  hiddenAddresses?: { type: string; address: string }[];
  onClick?(account: string, keyring: any): void;
  onShowMnemonics?(): void;
}

interface CompoundedComponent
  extends React.FunctionComponent<AddressListProps> {
  AddressItem: typeof AddressItem;
}

const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WatchAddressKeyring]: 4,
};

const AddressList: CompoundedComponent = ({
  list,
  action = 'switch',
  ActionButton,
  onClick,
  hiddenAddresses = [],
  onShowMnemonics,
}: AddressListProps) => {
  const { t } = useTranslation();
  const GroupItem = ({
    group,
    name,
  }: {
    name: string;
    group: DisplayedKeryring[];
  }) => {
    return (
      <li>
        <div className="subtitle flex justify-between">
          <span>{t(KEYRING_TYPE_TEXT[name])}</span>
          {name === KEYRING_TYPE.HdKeyring && action === 'management' && (
            <span
              className="flex items-center text-12 cursor-pointer"
              onClick={onShowMnemonics}
            >
              {t('View Mnemonic')}
              <img src={IconArrowRight} className="icon icon-arrow-right" />
            </span>
          )}
        </div>
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
      {Object.keys(list)
        .sort((a, b) => {
          return SORT_WEIGHT[a] - SORT_WEIGHT[b];
        })
        .map((name) => (
          <GroupItem key={name} name={name} group={list[name]} />
        ))}
    </ul>
  );
};

AddressList.AddressItem = AddressItem;

export default AddressList;
