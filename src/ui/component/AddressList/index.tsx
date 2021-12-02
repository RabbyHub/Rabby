import React, {
  forwardRef,
  useRef,
  useCallback,
  useState,
  useEffect,
  memo,
} from 'react';
import clsx from 'clsx';
import { findIndex } from 'lodash';
import { FixedSizeList, areEqual } from 'react-window';
import { DisplayedKeryring } from 'background/service/keyring';
import { KEYRING_TYPE } from 'consts';
import { useWallet } from 'ui/utils';

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
  alianNames?: any;
}
interface RowProps {
  data: any;
  index: number;
  style?: any;
  others?: any;
}
const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5,
};
const Row: React.FC<RowProps> = memo((props) => {
  const { data, index, style } = props;
  const { combinedList, others } = data;
  const { currentAccount, ActionButton, onClick, hiddenAddresses } = others;
  const account = combinedList[index];
  const [stopEditing, setStopEditing] = useState(false);
  return (
    <li
      className={clsx(
        'address-wrap',
        !currentAccount && 'address-wrap-with-padding'
      )}
      style={style}
    >
      <ul className="addresses" onClick={() => setStopEditing(true)}>
        <AddressItem
          key={account.address + account.brandName}
          account={{ ...account, type: account.type }}
          keyring={account.keyring}
          ActionButton={ActionButton}
          onClick={onClick}
          hiddenAddresses={hiddenAddresses}
          currentAccount={currentAccount}
          canEditing={() => setStopEditing(false)}
          stopEditing={stopEditing}
          showAssets
          className="h-[56px]"
        />
      </ul>
    </li>
  );
}, areEqual);

const AddressList: any = forwardRef(
  (
    {
      list,
      action = 'switch',
      ActionButton,
      onClick,
      hiddenAddresses = [],
      currentAccount,
      alianNames,
    }: AddressListProps,
    ref
  ) => {
    const wallet = useWallet();
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(10);
    const [alianNamesList, setAlianNamesList] = useState(alianNames);
    const addressItems = useRef(new Array(list.length));
    const fixedList = useRef<FixedSizeList>();
    const combinedList = list
      .sort((a, b) => {
        return SORT_WEIGHT[a.type] - SORT_WEIGHT[b.type];
      })
      .map((group) => {
        const templist = group.accounts.map(
          (item) =>
            (item = {
              ...item,
              alianName: alianNamesList[item.address.toLowerCase()],
              type: group.type,
              keyring: group.keyring,
            })
        );
        return templist;
      })
      .flat(1);
    const itemKey = useCallback(
      (index: number, data: any) =>
        data.combinedList[index].address + data.combinedList[index].brandName,
      []
    );
    const onItemsRendered = ({ overscanStartIndex, overscanStopIndex }) => {
      setStart(overscanStartIndex);
      setEnd(overscanStopIndex);
    };
    useEffect(() => {
      if (currentAccount) {
        const position = findIndex(combinedList, currentAccount);
        fixedList.current?.scrollToItem(position, 'center');
      }
    }, []);
    useEffect(() => {
      if (currentAccount) {
        const position = findIndex(combinedList, currentAccount);
        fixedList.current?.scrollToItem(position, 'center');
      }
    }, [alianNamesList]);
    const switchAddressHeight =
      combinedList.length > 5 ? 400 : combinedList.length * 80;
    return (
      <ul className={`address-group-list ${action}`}>
        <FixedSizeList
          height={currentAccount ? switchAddressHeight : 500}
          width="100%"
          itemData={{
            combinedList: combinedList,
            others: {
              ActionButton,
              onClick,
              hiddenAddresses,
              addressItems,
              currentAccount,
            },
          }}
          itemCount={combinedList.length}
          itemSize={64}
          itemKey={itemKey}
          ref={fixedList}
          onItemsRendered={onItemsRendered}
        >
          {Row}
        </FixedSizeList>
      </ul>
    );
  }
);

AddressList.AddressItem = AddressItem;

export default AddressList;
