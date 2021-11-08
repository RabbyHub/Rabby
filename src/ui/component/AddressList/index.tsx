import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useCallback,
  memo,
} from 'react';
import { FixedSizeList, areEqual } from 'react-window';
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
interface RowProps {
  data: any;
  index: number;
  style?: any;
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
    const addressItems = useRef({});
    list.forEach((group) => {
      if (addressItems.current[group.type]) {
        addressItems.current[group.type] = [
          ...addressItems.current[group.type],
          ...new Array(group.accounts.length),
        ];
      } else {
        addressItems.current[group.type] = new Array(group.accounts.length);
      }
    });
    const updateAllBalance = () => {
      const q: Promise<void>[] = [];
      Object.values(addressItems.current).forEach((arr: any) => {
        q.push(...arr.filter(Boolean).map((el) => el.updateBalance()));
      });
      return Promise.all(q);
    };

    useImperativeHandle(ref, () => ({
      updateAllBalance,
    }));
    const combinedList = list
      .sort((a, b) => {
        return SORT_WEIGHT[a.type] - SORT_WEIGHT[b.type];
      })
      .map((group) => {
        const templist = group.accounts.map(
          (item) =>
            (item = { ...item, type: group.type, keyring: group.keyring })
        );
        return templist;
      })
      .flat(1);
    const Row: React.FC<RowProps> = memo((props) => {
      const { data, index, style } = props;
      const account = data[index];
      return (
        <li className="address-wrap" style={style}>
          <ul className="addresses">
            <AddressItem
              key={account.address}
              account={{ ...account, type: account.type }}
              keyring={account.keyring}
              ActionButton={ActionButton}
              onClick={onClick}
              hiddenAddresses={hiddenAddresses}
              currentAccount={currentAccount}
              showAssets
              ref={(el) => {
                let i: number | null = index;
                while (
                  i !== null &&
                  i < addressItems.current[account.keyring.type].length
                ) {
                  if (addressItems.current[account.keyring.type][i]) {
                    i++;
                  } else {
                    addressItems.current[account.keyring.type][i] = el;
                    i = null;
                  }
                }
              }}
            />
          </ul>
        </li>
      );
    }, areEqual);
    const itemKey = useCallback(
      (index: number, data: any) => data[index].address,
      []
    );
    return (
      <ul className={`address-group-list ${action}`}>
        <FixedSizeList
          height={500}
          width="100%"
          itemData={combinedList}
          itemCount={combinedList.length}
          itemSize={76}
          itemKey={itemKey}
        >
          {Row}
        </FixedSizeList>
      </ul>
    );
  }
);

AddressList.AddressItem = AddressItem;

export default AddressList;
