import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { Menu, Dropdown, message } from 'antd';
import { FixedSizeList } from 'react-window';
import { KEYRING_TYPE, HARDWARE_KEYRING_TYPES } from 'consts';
import { useWallet } from 'ui/utils';
import {
  AddressList,
  PageHeader,
  AuthenticationModal,
  Modal,
  StrayFooter,
} from 'ui/component';
import AddressItem from 'ui/component/AddressList/AddressItem';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
import DisplayKeyring from 'background/service/keyring/display';
import IconPlusAddress from 'ui/assets/addAddress.png';
import IconHint from 'ui/assets/hint.png';
import IconSuccess from 'ui/assets/success.svg';

import './style.less';
import clsx from 'clsx';
const SORT_WEIGHT = {
  [KEYRING_TYPE.HdKeyring]: 1,
  [KEYRING_TYPE.SimpleKeyring]: 2,
  [KEYRING_TYPE.HardwareKeyring]: 3,
  [KEYRING_TYPE.WalletConnectKeyring]: 4,
  [KEYRING_TYPE.WatchAddressKeyring]: 5,
};
const { Nav: StrayFooterNav } = StrayFooter;

const AddressManagement = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<DisplayedKeryring[]>([]);
  const [displayList, setDisplayList] = useState([]);

  const [alianNames, setAlianNames] = useState<[]>([]);
  const [retrive, setRetrive] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  const [stopEditing, setStopEditing] = useState(true);
  const [editIndex, setEditIndex] = useState(0);
  const [hiddenAddresses, setHiddenAddresses] = useState<
    { type: string; address: string }[]
  >([]);
  const history = useHistory();

  const init = async () => {
    setHiddenAddresses(await wallet.getHiddenAddresses());
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    let count = 0;
    const c = accounts.reduce((res, item) => {
      return res + item.accounts.length;
    }, 0);
    count = c;
    setNoAccount(count <= 0);
  }, [accounts]);

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllClassAccounts();
    const allAlianNames = await wallet.getAllAlianName();
    setAccounts(_accounts);
    setAlianNames(allAlianNames);
    const list = _accounts
      .sort((a, b) => {
        return SORT_WEIGHT[a.type] - SORT_WEIGHT[b.type];
      })
      .map((group) => {
        const templist = group.accounts.map(
          (item) =>
            (item = {
              ...item,
              alianName: allAlianNames[item.address.toLowerCase()],
              type: group.type,
              keyring: group.keyring,
            })
        );
        return templist;
      })
      .flat(1);
    if (list.length > 0) {
      setDisplayList(list);
    }
  };

  const handleViewMnemonics = async () => {
    try {
      await AuthenticationModal({
        wallet,
        async validationHandler(password) {
          const mnemonic = await wallet.getMnemonics(password);
          Modal.info({
            title: t('Mnemonic'),
            centered: true,
            content: mnemonic,
            cancelText: null,
            okText: null,
            className: 'single-btn',
          });
        },
      });
    } catch (e) {
      // NOTHING
    }
  };

  const AddressActionButton = ({
    data,
    keyring,
    account,
  }: {
    data: string;
    keyring: DisplayKeyring;
    account: Account;
  }) => {
    const isHidden = hiddenAddresses.find(
      (item) => item.type === keyring.type && item.address === data
    );

    const handlleViewPrivateKey = async (address: string, type: string) => {
      try {
        await AuthenticationModal({
          wallet,
          async validationHandler(password) {
            const privateKey = await wallet.getPrivateKey(password, {
              address,
              type,
            });
            Modal.info({
              title: t('Private Key'),
              centered: true,
              content: privateKey,
              cancelText: null,
              okText: null,
              className: 'single-btn',
            });
          },
        });
      } catch (e) {
        // NOTHING
      }
    };

    const handleDeleteAddress = async () => {
      await wallet.removeAddress(data, keyring.type, account.brandName);
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('removed'),
        duration: 0.5,
      });
      getAllKeyrings();
    };

    const handleToggleAddressVisible = async () => {
      if (isHidden) {
        setHiddenAddresses(
          hiddenAddresses.filter(
            (item) => item.type !== keyring.type || item.address !== data
          )
        );
        await wallet.showAddress(keyring.type, data);
      } else {
        const totalCount = await wallet.getAccountsCount();
        if (hiddenAddresses.length >= totalCount - 1) {
          message.error(t('Keep at least one address visible'));
          return;
        }
        setHiddenAddresses([
          ...hiddenAddresses,
          { type: keyring.type, address: data },
        ]);
        await wallet.hideAddress(keyring.type, data);
      }
    };

    const DropdownOptions = () => {
      switch (keyring.type) {
        case KEYRING_TYPE.HdKeyring:
          return (
            <Menu>
              <Menu.Item onClick={handleToggleAddressVisible}>
                {t(
                  `${
                    hiddenAddresses.find(
                      (item) =>
                        item.address === data && item.type === keyring.type
                    )
                      ? 'Show'
                      : 'Hide'
                  } address`
                )}
              </Menu.Item>
              <Menu.Item
                onClick={() => handlleViewPrivateKey(data, keyring.type)}
              >
                {t('View private key')}
              </Menu.Item>
              <Menu.Item onClick={() => handleViewMnemonics()}>
                {t('View Mnemonic')}
              </Menu.Item>
            </Menu>
          );
        case KEYRING_TYPE.SimpleKeyring:
          return (
            <Menu>
              <Menu.Item onClick={handleToggleAddressVisible}>
                {t(
                  `${
                    hiddenAddresses.find(
                      (item) =>
                        item.address === data && item.type === keyring.type
                    )
                      ? 'Show'
                      : 'Hide'
                  } address`
                )}
              </Menu.Item>
              <Menu.Item
                onClick={() => handlleViewPrivateKey(data, keyring.type)}
              >
                {t('View private key')}
              </Menu.Item>
            </Menu>
          );
        case HARDWARE_KEYRING_TYPES.BitBox02.type:
        case HARDWARE_KEYRING_TYPES.Ledger.type:
        case HARDWARE_KEYRING_TYPES.Trezor.type:
        case HARDWARE_KEYRING_TYPES.Onekey.type:
        case KEYRING_TYPE.WalletConnectKeyring:
        case KEYRING_TYPE.WatchAddressKeyring:
          return (
            <Menu>
              <Menu.Item onClick={handleDeleteAddress}>
                {t('Delete address')}
              </Menu.Item>
            </Menu>
          );
        default:
          return <></>;
      }
    };
    return (
      <div className="flex items-center hint">
        <Dropdown overlay={DropdownOptions} trigger={['click']}>
          <img className="cursor-pointer" src={IconHint} />
        </Dropdown>
      </div>
    );
  };
  const fixedList = useRef<FixedSizeList>();
  useEffect(() => {
    getAllKeyrings();
    setRetrive(false);
  }, [retrive]);

  const NoAddressUI = (
    <div className="no-address">
      <img
        className="no-data-image"
        src="/images/nodata-address.png"
        alt="no address"
      />
      <p className="text-gray-content text-14">{t('NoAddress')}</p>
      <Link
        to="/add-address"
        className="flex no-data-add-btn rounded-md text-15"
      >
        <img src={IconPlusAddress} className="w-[16px] h-[16px] mr-10" />
        {t('Add addresses')}
      </Link>
    </div>
  );
  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const [canEdit, setCanEdit] = useState(!stopEditing && index === editIndex);
    const startEdit = (editing: boolean) => {
      setCanEdit(editing);
      if (editing) {
        setEditIndex(index);
        setStopEditing(false);
      } else {
        setStopEditing(true);
      }
    };
    const retriveAlianName = () => {
      setRetrive(true);
    };
    return (
      <li className="address-wrap-with-padding" style={style}>
        <ul className="addresses">
          <AddressItem
            key={account.address + account.brandName}
            account={{ ...account, type: account.type }}
            keyring={account.keyring}
            ActionButton={AddressActionButton}
            hiddenAddresses={hiddenAddresses}
            index={index}
            stopEditing={!canEdit}
            canEditing={startEdit}
            retriveAlianName={retriveAlianName}
            className="h-[56px] pl-16"
          />
        </ul>
      </li>
    );
  };
  return (
    <div
      className="address-management"
      onClick={(e) => {
        e.stopPropagation();
        setStopEditing(true);
      }}
    >
      <PageHeader>{t('Address Management')}</PageHeader>
      {noAccount ? (
        NoAddressUI
      ) : (
        <>
          <ul
            className={'address-group-list management'}
            onClick={(e) => {
              e.stopPropagation();
              setStopEditing(true);
            }}
          >
            <FixedSizeList
              height={500}
              width="100%"
              itemData={displayList}
              itemCount={displayList.length}
              itemSize={64}
              ref={fixedList}
            >
              {Row}
            </FixedSizeList>
          </ul>
          <StrayFooterNav
            hasDivider
            onNextClick={() => {
              history.push('/add-address');
            }}
            NextButtonContent={
              <div className="flex items-center h-full justify-center text-15">
                <img
                  src={IconPlusAddress}
                  className="w-[16px] h-[16px] mr-10"
                />
                {t('Add Address')}
              </div>
            }
          />
        </>
      )}
    </div>
  );
};

export default AddressManagement;
