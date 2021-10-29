import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { Menu, Dropdown, message } from 'antd';
import { KEYRING_TYPE, HARDWARE_KEYRING_TYPES } from 'consts';
import { useWallet } from 'ui/utils';
import {
  AddressList,
  PageHeader,
  AuthenticationModal,
  Modal,
  StrayFooter,
} from 'ui/component';
import { DisplayedKeryring } from 'background/service/keyring';
import DisplayKeyring from 'background/service/keyring/display';
import { SvgIconPlusPrimary } from 'ui/assets';
import IconHint from 'ui/assets/hint.png';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const { Nav: StrayFooterNav } = StrayFooter;

const AddressManagement = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<DisplayedKeryring[]>([]);
  const [noAccount, setNoAccount] = useState(false);
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

    setAccounts(_accounts);
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
  }: {
    data: string;
    keyring: DisplayKeyring;
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
      await wallet.removeAddress(data, keyring.type);
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

  useEffect(() => {
    getAllKeyrings();
  }, []);

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
        <SvgIconPlusPrimary className="icon icon-plus text-blue-light stroke-current fill-current" />
        {t('Add addresses')}
      </Link>
    </div>
  );

  return (
    <div className="address-management">
      <PageHeader>{t('Address Management')}</PageHeader>
      {noAccount ? (
        NoAddressUI
      ) : (
        <>
          <AddressList
            list={accounts}
            action="management"
            ActionButton={AddressActionButton}
            hiddenAddresses={hiddenAddresses}
            onShowMnemonics={handleViewMnemonics}
          />
          <StrayFooterNav
            hasDivider
            onNextClick={() => {
              history.push('/add-address');
            }}
            NextButtonContent={
              <div className="flex items-center h-full justify-center text-15">
                <SvgIconPlusPrimary className="icon icon-add text-white stroke-current fill-current mr-6" />
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
