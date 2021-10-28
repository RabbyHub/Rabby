import React, { useImperativeHandle, forwardRef, useRef } from 'react';
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
  onClick?(account: string, keyring: any, brandName: string): void;
  onShowMnemonics?(): void;
  currentAccount?: any;
}

const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WatchAddressKeyring]: 4,
};

const AddressList: any = forwardRef(
  (
    {
      list,
      action = 'switch',
      ActionButton,
      onClick,
      hiddenAddresses = [],
      onShowMnemonics,
      currentAccount,
    }: AddressListProps,
    ref
  ) => {
    const { t } = useTranslation();
    const addressItems = useRef({});
    Object.keys(list).forEach((type) => {
      list[type].forEach((keyring) => {
        addressItems.current[keyring.type] = addressItems.current[keyring.type]
          ? [
              ...addressItems.current[keyring.type],
              ...new Array(keyring.accounts.length),
            ]
          : new Array(keyring.accounts.length);
      });
    });

    const updateAllBalance = () => {
      const q: Promise<void>[] = [];
      Object.values(addressItems.current).forEach((arr: any) => {
        q.push(...arr.map((el) => el.updateBalance()));
      });
      return Promise.all(q);
    };

    useImperativeHandle(ref, () => ({
      updateAllBalance,
    }));
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
              accounts.map((account, index) => (
                <AddressItem
                  key={account.address}
                  account={account}
                  keyring={keyring}
                  ActionButton={ActionButton}
                  onClick={onClick}
                  hiddenAddresses={hiddenAddresses}
                  currentAccount={currentAccount}
                  showAssets
                  ref={(el) => {
                    let i: number | null = index;
                    while (
                      i !== null &&
                      i < addressItems.current[keyring.type].length
                    ) {
                      if (addressItems.current[keyring.type][i]) {
                        i++;
                      } else {
                        addressItems.current[keyring.type][i] = el;
                        i = null;
                      }
                    }
                  }}
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
  }
);

AddressList.AddressItem = AddressItem;

export default AddressList;
