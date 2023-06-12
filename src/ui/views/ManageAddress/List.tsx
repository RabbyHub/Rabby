import React from 'react';
import { DisplayedAccount } from './hooks';
import { VariableSizeList as VList } from 'react-window';
import { IHighlightedAddress } from '@/background/service/preference';
import { KEYRING_TYPE } from '@/constant';
import { IDisplayedAccountWithBalance } from 'ui/models/accountToDisplay';
import AddressItem from '../AddressManagement/AddressItem';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { useRabbyDispatch } from '@/ui/store';
import { obj2query } from '@/ui/utils/url';

import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';
import { message } from 'antd';
import IconSuccess from 'ui/assets/success.svg';

export const AccountList = ({
  list,
  highlightedAddresses = [],
  handleOpenDeleteModal,
}: {
  list?: DisplayedAccount[];
  highlightedAddresses?: IHighlightedAddress[];
  handleOpenDeleteModal: (
    list: IDisplayedAccountWithBalance[],
    deleteGroup?: boolean
  ) => void;
}) => {
  const history = useHistory();

  const dispatch = useRabbyDispatch();

  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const favorited = highlightedAddresses.some(
      (highlighted) =>
        account.address === highlighted.address &&
        account.brandName === highlighted.brandName
    );

    const onDelete = React.useMemo(() => {
      if (account.type === KEYRING_TYPE['HdKeyring']) {
        return async () => {
          await dispatch.addressManagement.removeAddress([
            account.address,
            account.type,
            account.brandName,
            false,
          ]);
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: 'Deleted',
            duration: 0.5,
          });
        };
      }
      if (account.type === KEYRING_TYPE['SimpleKeyring']) {
        return () => {
          handleOpenDeleteModal([account], false);
        };
      }

      return undefined;
    }, [account, KEYRING_TYPE['HdKeyring']]);

    return (
      <div className="address-wrap-with-padding px-[20px]" style={style}>
        <AddressItem
          balance={account.balance}
          address={account.address}
          type={account.type}
          brandName={account.brandName}
          alias={account.alianName}
          onDelete={onDelete}
          extra={
            <div
              className={clsx(
                'icon-star  border-none px-0',
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
              <img
                className="w-[13px] h-[13px]"
                src={favorited ? IconPinnedFill : IconPinned}
                alt=""
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
          enableSwitch={false}
        />
      </div>
    );
  };
  if (!list || !list.length) {
    return null;
  }
  return (
    <VList
      height={450}
      width="100%"
      itemData={list}
      itemCount={list.length}
      itemSize={() => 64}
      className="w-auto"
    >
      {Row}
    </VList>
  );
};
