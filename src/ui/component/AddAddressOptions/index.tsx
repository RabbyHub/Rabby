import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import Field from './Field';
import IconArrowRight from 'ui/assets/bookmark.svg';
import IconHighLight from 'ui/assets/walletlogo/highlightstar.svg';

import './style.less';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconImportAdress from 'ui/assets/walletlogo/import-address.svg';

import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';

import {
  IS_CHROME,
  WALLET_BRAND_CONTENT,
  BRAND_WALLET_CONNECT_TYPE,
  IWalletBrandContent,
} from 'consts';

import clsx from 'clsx';
import _ from 'lodash';
import { connectStore } from '@/ui/store';

const BULTINS_TYPES = [
  { type: 'createAddress' as const },
  { type: 'importAddress' as const },
  { type: 'addWatchMode' as const },

  { type: 'imporPrivateKey' as const, deprecated: true },
  { type: 'importviaMnemonic' as const, deprecated: true },
  { type: 'importKeystore' as const, deprecated: true },
];

const { normalTypes, deprecatedTypes } = BULTINS_TYPES.reduce(
  (accu, item) => {
    if (item.deprecated) {
      accu.deprecatedTypes.push(item.type);
    } else {
      accu.normalTypes.push(item.type);
    }

    return accu;
  },
  {
    normalTypes: [] as typeof BULTINS_TYPES[number]['type'][],
    deprecatedTypes: [] as typeof BULTINS_TYPES[number]['type'][],
  }
);

const AddAddressOptions = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const [savedWallet, setSavedWallet] = useState<any[]>([]);
  const [savedWalletData, setSavedWalletData] = useState<ISavedWalletData[]>(
    []
  );
  const init = async () => {
    const walletSavedList = await wallet.getHighlightWalletList();
    const filterdlist = walletSavedList.filter(Boolean);
    if (filterdlist.toString() !== savedWallet.toString()) {
      setSavedWallet(filterdlist);
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
      history.push({
        pathname: '/import/qrcode',
        state: {
          brand: item.brand,
        },
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
      },
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
        if (normalTypes.includes(item)) {
          result.push(
            renderData.find((data) => data.brand === item) as IRenderItem
          );
        } else if (!deprecatedTypes.includes(item)) {
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
  const { displayNormalData, showStaticDivideLine } = React.useMemo(() => {
    const displayNormalData = renderData
      .map((item) => {
        const existItem = savedWallet.filter((brand) => brand === item.brand);
        if (existItem.length > 0) return null;
        return item;
      })
      .filter(Boolean);
    const showStaticDivideLine = displayNormalData.length >= 1;
    return { displayNormalData, showStaticDivideLine };
  }, [renderData]);

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
        {showStaticDivideLine && <div className="divide-line-list"></div>}
        {displayNormalData.map((data, idx) => {
          return (
            <React.Fragment key={data!.content}>
              {data?.brand === 'addWatchMode' && idx !== 0 && (
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
