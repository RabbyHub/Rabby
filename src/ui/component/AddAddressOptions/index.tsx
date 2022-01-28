import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import Field from '../Field';
import IconArrowRight from 'ui/assets/bookmark.svg';
import IconHighLight from 'ui/assets/walletlogo/highlightstar.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';
import IconMnemonics from 'ui/assets/walletlogo/mnemonics.svg';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconKeystore from 'ui/assets/walletlogo/keystore.svg';
import IconPrivatekey from 'ui/assets/walletlogo/privatekey.svg';
import {
  IS_CHROME,
  WALLET_BRAND_CONTENT,
  KEYRING_CLASS,
  BRAND_ALIAN_TYPE_TEXT,
} from 'consts';

import clsx from 'clsx';
const normaltype: string[] = [
  'createAddress',
  'addWatchMode',
  'imporPrivateKey',
  'importviaMnemonic',
  'importKeystore',
];
const AddAddressOptions = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [savedWallet, setSavedWallet] = useState([]);
  const [savedWalletData, setSavedWalletData] = useState([]);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const init = async () => {
    const walletSavedList = await wallet.getHighlightWalletList();
    const filterdlist = walletSavedList.filter(Boolean);
    if (filterdlist.toString() !== savedWallet.toString()) {
      await setSavedWallet(filterdlist);
    }
    const accounts = await wallet.getTypedAccounts(KEYRING_CLASS.MNEMONIC);
    if (accounts.length <= 0) {
      setShowMnemonic(true);
    }
    const savedTemp: [] = await renderSavedData();
    setSavedWalletData(savedTemp);
  };
  const connectRouter = (item) => {
    if (item.connectType === 'BitBox02Connect') {
      openInternalPageInTab('import/hardware?connectType=BITBOX02');
    } else if (item.connectType === 'GridPlusConnect') {
      openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
    } else if (item.connectType === 'TrezorConnect') {
      openInternalPageInTab('import/hardware?connectType=TREZOR');
    } else if (item.connectType === 'LedgerConnect') {
      openInternalPageInTab(
        IS_CHROME ? 'import/hardware/ledger-connect' : 'import/hardware/ledger'
      );
    } else if (item.connectType === 'OneKeyConnect') {
      openInternalPageInTab('import/hardware?connectType=ONEKEY');
    } else if (item.connectType === 'GnosisConnect') {
      history.push({
        pathname: '/import/gnosis',
      });
    } else {
      history.push({
        pathname: '/import/wallet-connect',
        state: {
          brand: item,
        },
      });
    }
  };
  const brandWallet = Object.values(WALLET_BRAND_CONTENT)
    .map((item) => {
      const existBrand = savedWallet.filter((brand) => brand === item.brand);
      if (existBrand.length > 0) return null;
      return {
        leftIcon: item.image,
        content: t(item.name),
        brand: item.brand,
        connectType: item.connectType,
        image: item.image,
        onClick: () => connectRouter(item),
      };
    })
    .filter(Boolean);
  const renderData = [
    {
      leftIcon: IconCreatenewaddr,
      content: t('createAddress'),
      brand: 'createAddress',
      onClick: async () => {
        if (await wallet.checkHasMnemonic()) {
          const account = await wallet.deriveNewAccountFromMnemonic();
          const allAccounts = await wallet.getTypedAccounts(
            KEYRING_CLASS.MNEMONIC
          );
          let mnemonLengh = 0;
          if (allAccounts.length > 0) {
            mnemonLengh = allAccounts[0]?.accounts?.length;
          }
          if (account && account.length > 0) {
            await wallet.updateAlianName(
              account[0]?.toLowerCase(),
              `${BRAND_ALIAN_TYPE_TEXT[KEYRING_CLASS.MNEMONIC]} ${
                mnemonLengh + 1
              }`
            );
          }
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: t('Successfully created'),
          });

          history.push('/dashboard');
        } else {
          history.push('/create-mnemonics');
        }
      },
      subText: showMnemonic
        ? t('A new mnemonic will be created')
        : t('Create a new address with your mnemonic'),
    },
    {
      leftIcon: IconAddwatchmodo,
      brand: 'addWatchMode',
      content: t('Add Watch Mode Address'),
      subText: t('Add address without private keys'),
      onClick: () => history.push('/import/watch-address'),
    },
    {
      leftIcon: IconPrivatekey,
      brand: 'imporPrivateKey',
      content: t('Import Private Key'),
      onClick: () => history.push('/import/key'),
    },
    {
      leftIcon: IconMnemonics,
      brand: 'importviaMnemonic',
      content: t('Import via Mnemonic'),
      onClick: () => history.push('/import/mnemonics'),
    },
    {
      leftIcon: IconKeystore,
      brand: 'importKeystore',
      content: t('Import Your Keystore'),
      onClick: () => history.push('/import/json'),
    },
  ];
  const renderSavedData = () => {
    if (savedWallet.length > 0) {
      const result = [] as any;
      savedWallet.map((item) => {
        if (normaltype.includes(item)) {
          result.push(renderData.find((data) => data.brand === item));
        } else {
          const savedItem = Object.values(WALLET_BRAND_CONTENT).find(
            (wallet) => wallet.brand.toString() === item
          );
          result.push({
            leftIcon: savedItem!.image || '',
            content: t(savedItem!.name),
            brand: savedItem!.brand,
            image: savedItem!.image,
            connectType: savedItem!.connectType,
            onClick: () => connectRouter(savedItem),
          });
        }
      });
      return result.sort((a, b) => (a.content > b.content ? 1 : -1));
    }
    return [];
  };
  const displayNormalData = renderData
    .map((item) => {
      const existItem = savedWallet.filter((brand) => brand === item.brand);
      if (existItem.length > 0) return null;
      return item;
    })
    .filter(Boolean);

  useEffect(() => {
    init();
  }, [savedWallet]);
  return (
    <>
      <div className="saved-list">
        {savedWalletData.length > 0 &&
          savedWalletData.map((data: any) => (
            <Field
              className="address-options"
              key={`saved${data.content}`}
              brand={data.brand || data.type}
              leftIcon={
                <img
                  src={data.leftIcon}
                  className={clsx('icon', data.connectType && 'wallet-icon')}
                />
              }
              rightIcon={
                <img src={IconHighLight} className="icon icon-arrow-right" />
              }
              showWalletConnect={data.connectType === 'WalletConnect'}
              onClick={data.onClick}
              callback={init}
              unselect
              address
            >
              {data.content}
            </Field>
          ))}
      </div>
      <div
        className={clsx(
          'add-address-options',
          brandWallet.length === 0 &&
            displayNormalData.length === 0 &&
            'hideclass'
        )}
      >
        <div
          className={clsx(
            'connect-hint',
            brandWallet.length === 0 && 'hideclass'
          )}
        >
          {t('Connect with')}
        </div>
        {brandWallet.map((data) => (
          <Field
            className="address-options"
            key={data!.content}
            brand={data!.brand}
            leftIcon={<img src={data!.leftIcon} className="icon wallet-icon" />}
            rightIcon={
              !savedWallet.toString().includes(data!.brand) ? (
                <img src={IconArrowRight} className="icon icon-arrow-right" />
              ) : null
            }
            showWalletConnect={data!.connectType === 'WalletConnect'}
            onClick={data!.onClick}
            callback={init}
            address
          >
            {data!.content}
          </Field>
        ))}
        <div className="divide-line-list"></div>
        {displayNormalData.map((data) => {
          return !showMnemonic && data!.brand === 'importviaMnemonic' ? null : (
            <Field
              className="address-options"
              key={data!.content}
              leftIcon={<img src={data!.leftIcon} className="icon" />}
              rightIcon={
                !savedWallet.toString().includes(data!.brand) ? (
                  <img src={IconArrowRight} className="icon icon-arrow-right" />
                ) : null
              }
              brand={data!.brand}
              subText={data!.subText}
              onClick={data!.onClick}
              callback={init}
              address
            >
              {data!.content}
            </Field>
          );
        })}
      </div>
    </>
  );
};

export default AddAddressOptions;
