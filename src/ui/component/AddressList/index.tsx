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
  const {
    currentAccount,
    ActionButton,
    onClick,
    hiddenAddresses,
    stopEditing,
    setStopEditing,
    editIndex,
  } = others;
  const account = combinedList[index];
  return (
    <li
      className={clsx(
        'address-wrap',
        !currentAccount && 'address-wrap-with-padding'
      )}
      style={style}
    >
      <ul className="addresses">
        <AddressItem
          key={account.address + account.brandName}
          account={{ ...account, type: account.type }}
          keyring={account.keyring}
          ActionButton={ActionButton}
          onClick={onClick}
          hiddenAddresses={hiddenAddresses}
          currentAccount={currentAccount}
          canEditing={setStopEditing}
          stopEditing={stopEditing || editIndex !== index}
          index={index}
          showAssets
          className="h-[56px] pl-16"
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
    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(10);
    const [editIndex, setEditIndex] = useState(0);

    const [alianNamesList, setAlianNamesList] = useState(alianNames);
    const [stopEditing, setStopEditing] = useState(false);
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
      <ul
        className={`address-group-list ${action}`}
        onClick={() => setStopEditing(true)}
      >
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
              stopEditing,
              setStopEditing,
              editIndex,
              setEditIndex,
            },
          }}
          itemCount={combinedList.length}
          itemSize={64}
          itemKey={itemKey}
          ref={fixedList as React.MutableRefObject<FixedSizeList<any>>}
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
