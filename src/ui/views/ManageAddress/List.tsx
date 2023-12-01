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

import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';
import { message } from 'antd';
import IconSuccess from 'ui/assets/success.svg';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

export const AccountList = ({
  list,
  highlightedAddresses = [],
  handleOpenDeleteModal,
  updateIndex,
}: {
  list?: DisplayedAccount[];
  highlightedAddresses?: IHighlightedAddress[];
  handleOpenDeleteModal: (
    list: IDisplayedAccountWithBalance[],
    deleteGroup?: boolean
  ) => void;
  updateIndex: (b: boolean) => void;
}) => {
  const history = useHistory();
  const { t } = useTranslation();

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
      if (account.type === KEYRING_TYPE['SimpleKeyring']) {
        return () => {
          handleOpenDeleteModal([account], false);
        };
      }
      return async () => {
        await dispatch.addressManagement.removeAddress([
          account.address,
          account.type,
          account.brandName,
          account.type !== KEYRING_TYPE['HdKeyring'],
        ]);
        if (data.length === 1 && account.type !== KEYRING_TYPE['HdKeyring']) {
          updateIndex(
            data.length === 1 && account.type !== KEYRING_TYPE['HdKeyring']
          );
        }
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: t('page.manageAddress.deleted'),
          duration: 0.5,
        });
      };
    }, [account, KEYRING_TYPE['HdKeyring'], data.length, updateIndex]);

    return (
      <div className="address-wrap px-[20px]" style={style}>
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
          enableSwitch={false}
        />
      </div>
    );
  };
  if (!list || !list.length) {
    return null;
  }
  return (
    <div>
      {list.map((item, index) => (
        <Row data={list} index={index} key={item.address} />
      ))}
    </div>
  );
};
