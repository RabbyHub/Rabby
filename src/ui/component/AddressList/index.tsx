import React, {
  useImperativeHandle,
  forwardRef,
  useRef,
  useCallback,
  useState,
  useEffect,
  memo,
} from 'react';
import { findIndex } from 'lodash';
import { FixedSizeList, areEqual } from 'react-window';
import { DisplayedKeryring } from 'background/service/keyring';
import { KEYRING_TYPE } from 'consts';
import AddressItem, { AddressItemProps } from './AddressItem';
import './style.less';
import clsx from 'clsx';
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
    const addressItems = useRef(new Array(list.length));
    const fixedList = useRef<FixedSizeList>();

    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(10);
    const updateAllBalance = () => {
      addressItems.current.slice(start, end + 1).forEach((item) => {
        item.updateBalance();
      });
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
        <li
          className={clsx(
            'address-wrap',
            !currentAccount && 'address-wrap-with-padding'
          )}
          style={style}
        >
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
                addressItems.current[index] = el;
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
    return (
      <ul className={`address-group-list ${action}`}>
        <FixedSizeList
          height={currentAccount ? 380 : 500}
          width="100%"
          itemData={combinedList}
          itemCount={combinedList.length}
          itemSize={76}
          itemKey={itemKey}
          onItemsRendered={onItemsRendered}
          ref={fixedList}
        >
          {Row}
        </FixedSizeList>
      </ul>
    );
  }
);

AddressList.AddressItem = AddressItem;

export default AddressList;
