import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { getUiType, useWallet } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import Field from './Field';
import IconArrowRight from 'ui/assets/bookmark.svg';
import IconHighLight from 'ui/assets/walletlogo/highlightstar.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconImportAdress from 'ui/assets/walletlogo/import-address.svg';

import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';

import { useIsShowMnemonic } from 'ui/store-hooks';

import {
  IS_CHROME,
  WALLET_BRAND_CONTENT,
  KEYRING_CLASS,
  BRAND_ALIAN_TYPE_TEXT,
  BRAND_WALLET_CONNECT_TYPE,
  IWalletBrandContent,
} from 'consts';

import clsx from 'clsx';
import _ from 'lodash';
import { connectStore } from '@/ui/store';

const normaltype = ['createAddress', 'importAddress', 'addWatchMode'] as const;
const AddAddressOptions = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [savedWallet, setSavedWallet] = useState([]);
  const [savedWalletData, setSavedWalletData] = useState<ISavedWalletData[]>(
    []
  );
  const isShowMnemonic = useIsShowMnemonic();
  const [keystoneInited, setKeystoneInited] = useState(false);
  const init = async () => {
    const walletSavedList = await wallet.getHighlightWalletList();
    const filterdlist = walletSavedList.filter(Boolean);
    if (filterdlist.toString() !== savedWallet.toString()) {
      setSavedWallet(filterdlist);
    }

    const keystoneAccounts = await wallet.getTypedAccounts(
      KEYRING_CLASS.HARDWARE.KEYSTONE
    );
    if (keystoneAccounts.length > 0) {
      setKeystoneInited(true);
    }
    const savedTemp = renderSavedData();
    setSavedWalletData(savedTemp);
  };
  type Valueof<T> = T[keyof T];
  const connectRouter = (item: Valueof<typeof WALLET_BRAND_CONTENT>) => {
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
    } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.QRCodeBase) {
      if (keystoneInited) {
        history.push({
          pathname: '/popup/import/select-address',
          state: {
            keyring: KEYRING_CLASS.HARDWARE.KEYSTONE,
          },
        });
      } else {
        history.push({
          pathname: '/import/qrcode',
          state: {
            brand: item.brand,
          },
        });
      }
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
        category: item.category,
      };
    })
    .filter(Boolean);

  const wallets = _.groupBy(brandWallet, 'category');

  const renderList = [
    {
      title: 'Connect with Hardware Wallets',
      key: 'hardware',
    },
    {
      title: 'Connect with Institutional Wallets',
      key: 'institutional',
    },
    {
      title: 'Connect with Mobile Wallet Apps',
      key: 'mobile',
    },
  ]
    .map((item) => {
      return {
        ...item,
        values: wallets[item.key],
      };
    })
    .filter((item) => item.values);

  type IRenderItem = {
    leftIcon: string;
    brand: string;
    content: string;
    onClick: () => void;
    subText?: undefined;
  };
  const renderData: IRenderItem[] = [
    {
      leftIcon: IconCreatenewaddr,
      content: t('createAddress'),
      brand: 'createAddress',
      onClick: async () => {
        history.push('/mnemonics/create');
        // if (await wallet.checkHasMnemonic()) {
        //   const account = await wallet.deriveNewAccountFromMnemonic();
        //   const allAccounts = await wallet.getTypedAccounts(
        //     KEYRING_CLASS.MNEMONIC
        //   );
        //   let mnemonLengh = 0;
        //   if (allAccounts.length > 0) {
        //     mnemonLengh = allAccounts[0]?.accounts?.length;
        //   }
        //   if (account && account.length > 0) {
        //     await wallet.updateAlianName(
        //       account[0]?.toLowerCase(),
        //       `${BRAND_ALIAN_TYPE_TEXT[KEYRING_CLASS.MNEMONIC]} ${
        //         mnemonLengh + 1
        //       }`
        //     );
        //   }
        //   message.success({
        //     icon: <img src={IconSuccess} className="icon icon-success" />,
        //     content: t('Created successfully'),
        //   });

        //   if (getUiType().isTab) {
        //     setTimeout(() => {
        //       window.close();
        //     }, 2000);
        //     return;
        //   }

        //   history.push('/dashboard');
        // } else {
        //   history.push('/mnemonics/create');
        // }
      },
      // subText: isShowMnemonic
      //   ? t('A new mnemonic will be created')
      //   : t('Create a new address with your mnemonic'),
    },
    {
      leftIcon: IconImportAdress,
      brand: 'importAddress',
      content: 'Import Address',
      onClick: () => history.push('/import/entry-import-address'),
    },
    {
      leftIcon: IconAddwatchmodo,
      brand: 'addWatchMode',
      content: t('Add Watch Mode Address'),
      subText: t('Add address without private keys'),
      onClick: () => history.push('/import/watch-address'),
    },
  ];
  type ISavedWalletData = IRenderItem & {
    image?: IWalletBrandContent['image'];
    connectType?: IWalletBrandContent['connectType'];
  };
  const renderSavedData = () => {
    if (savedWallet.length > 0) {
      const result: ISavedWalletData[] = [];
      savedWallet.map((item) => {
        if (normaltype.includes(item)) {
          result.push(
            renderData.find((data) => data.brand === item) as IRenderItem
          );
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
            onClick: () => connectRouter(savedItem!),
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
        {renderList.map((item) => {
          return (
            <div key={item.key}>
              <div className={clsx('connect-hint')}>{item.title}</div>
              {item.values?.map((data) => (
                <Field
                  className="address-options"
                  key={data!.content}
                  brand={data!.brand}
                  leftIcon={
                    <img src={data!.leftIcon} className="icon wallet-icon" />
                  }
                  rightIcon={
                    !savedWallet.toString().includes(data!.brand) ? (
                      <img
                        src={IconArrowRight}
                        className="icon icon-arrow-right"
                      />
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
            </div>
          );
        })}
        <div className="divide-line-list"></div>
        {displayNormalData.map((data) => {
          return (
            <React.Fragment key={data!.content}>
              {data?.brand === 'addWatchMode' && (
                <div className="divide-line-list"></div>
              )}
              <Field
                className="address-options"
                leftIcon={<img src={data!.leftIcon} className="icon" />}
                rightIcon={
                  !savedWallet.toString().includes(data!.brand) ? (
                    <img
                      src={IconArrowRight}
                      className="icon icon-arrow-right"
                    />
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
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

export default connectStore()(AddAddressOptions);
