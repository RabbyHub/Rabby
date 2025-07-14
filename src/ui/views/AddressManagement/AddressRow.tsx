// Row.tsx
import React from 'react';
import clsx from 'clsx';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import AddressItem from './AddressItem';
import { obj2query } from '@/ui/utils/url';
import { SessionStatusBar } from 'ui/component/WalletConnect/SessionStatusBar';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';

type RowProps = {
  data: any[];
  index: number;
  style?: React.CSSProperties;
  accountsList: any[];
  highlightedAddresses: any[];
  isUpdateAllBalanceLoading: boolean;
  dispatch: any;
  currentAccount: any;
  history: any;
  enableSwitch: boolean;
  switchAccount: (account: any) => void;
  addressSortStore: any;
  AddNewAddressColumn: React.ReactNode;
  currentAccountIndex: number;
  accountList: any[];
  isWalletConnect: boolean;
};

const AddressRow: React.FC<RowProps> = ({
  data,
  index,
  style,
  accountsList,
  highlightedAddresses,
  isUpdateAllBalanceLoading,
  dispatch,
  currentAccount,
  history,
  enableSwitch,
  switchAccount,
  addressSortStore,
  AddNewAddressColumn,
  currentAccountIndex,
  accountList,
  isWalletConnect,
}) => {
  const account = data[index];

  const render = (account: typeof accountsList[number], isGroup = false) => {
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    return (
      <React.Fragment key={account.address}>
        <div style={style}>
          <AddressItem
            balance={account.balance}
            address={account.address}
            type={account.type}
            brandName={account.brandName}
            alias={account.alianName}
            isCurrentAccount={account.address === currentAccount?.address}
            isUpdatingBalance={isUpdateAllBalanceLoading}
            extra={
              <div
                className={clsx(
                  'icon-star border-none px-0',
                  favorited ? 'is-active' : 'opacity-0 group-hover:opacity-100'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  dispatch.addressManagement.toggleHighlightedAddressAsync({
                    address: account.address,
                    brandName: account.brandName,
                  });
                }}
              >
                <ThemeIcon
                  className="w-[13px] h-[13px]"
                  src={favorited ? RcIconPinnedFill : RcIconPinned}
                />
              </div>
            }
            onClick={() => {
              history.push(
                `/settings/address-detail?${obj2query({
                  address: account.address,
                  type: account.type,
                  brandName: account.brandName,
                  byImport: account.byImport || '',
                })}`
              );
            }}
            onSwitchCurrentAccount={() => {
              switchAccount(account);
            }}
            enableSwitch={enableSwitch}
          >
            {isWalletConnect && (
              <SessionStatusBar
                address={accountList[currentAccountIndex].address || ''}
                brandName={accountList[currentAccountIndex].brandName || ''}
                className="m-[16px] mt-0 text-white bg-[#0000001A]"
                type={accountList[currentAccountIndex].type}
              />
            )}
          </AddressItem>
        </div>
      </React.Fragment>
    );
  };

  // Uncomment and adapt if you want to support group rendering
  // if (addressSortStore.sortType === 'addressType') {
  //   return (
  //     <div style={style} className="address-type-container">
  //       {(account as typeof accountsList)?.map((e) => render(e, true))}
  //       {index === data.length - 1 ? (
  //         <div className="mx-20">{AddNewAddressColumn}</div>
  //       ) : null}
  //     </div>
  //   );
  // }

  return render(account as typeof accountsList[number]);
};

export default AddressRow;
