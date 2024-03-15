import React, { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconWalletConnect, {
  ReactComponent as RcIconWalletConnect,
} from 'ui/assets/walletlogo/walletconnect.svg';
import IconCreatenewaddr, {
  ReactComponent as RcIconCreatenewaddr,
} from 'ui/assets/walletlogo/createnewaddr.svg';
import IconAddwatchmodo, {
  ReactComponent as RcIconAddwatchmodo,
} from 'ui/assets/walletlogo/addwatchmode.svg';
import IconHardWallet, {
  ReactComponent as RcIconHardWallet,
} from 'ui/assets/address/hardwallet.svg';
import IconMobileWallet, {
  ReactComponent as RcIconMobileWallet,
} from 'ui/assets/address/mobile-wallet.svg';
import InstitutionalWallet, {
  ReactComponent as RcInstitutionalWallet,
} from 'ui/assets/address/institutional-wallet.svg';
import IconMetamask, {
  ReactComponent as RcIconMetamask,
} from 'ui/assets/dashboard/icon-metamask.svg';
import IconMnemonics, {
  ReactComponent as RcIconMnemonics,
} from 'ui/assets/import/mnemonics-light.svg';
import IconPrivatekey, {
  ReactComponent as RcIconPrivatekey,
} from 'ui/assets/import/privatekey-light.svg';

import { ReactComponent as IconAddFromCurrentSeedPhrase } from 'ui/assets/address/add-from-current-seed-phrase.svg';

import './style.less';

import {
  IS_CHROME,
  WALLET_BRAND_CONTENT,
  BRAND_WALLET_CONNECT_TYPE,
  WALLET_BRAND_TYPES,
  IWalletBrandContent,
  WALLET_SORT_SCORE,
  WALLET_BRAND_CATEGORY,
} from 'consts';

import clsx from 'clsx';
import _ from 'lodash';
import { connectStore } from '@/ui/store';
import { Item } from '../Item';
import { useWallet } from '@/ui/utils';
import { Modal } from 'antd';
import ThemeIcon from '../ThemeMode/ThemeIcon';
import { useHadSeedPhrase } from '@/ui/views/AddFromCurrentSeedPhrase/hooks';

const getSortNum = (s: string) => WALLET_SORT_SCORE[s] || 999999;

const AddAddressOptions = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const location = useLocation();
  const wallet = useWallet();

  const [selectedWalletType, setSelectedWalletType] = useState('');
  const handleRouter = async (action: (h: typeof history) => void) =>
    (await wallet.isBooted())
      ? action(history)
      : history.push({
          pathname: '/password',
          state: {
            handle: (h: typeof history) => action(h),
          },
        });

  // keep selected wallet type
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const lastSelectedWalletType = sessionStorage.getItem(
      'SELECTED_WALLET_TYPE'
    );
    if (
      lastSelectedWalletType &&
      ([
        WALLET_BRAND_CATEGORY.MOBILE,
        WALLET_BRAND_CATEGORY.INSTITUTIONAL,
      ] as string[]).includes(lastSelectedWalletType)
    ) {
      setSelectedWalletType(lastSelectedWalletType);
      setTimeout(() => {
        rootRef.current
          ?.querySelector(`.${lastSelectedWalletType}`)
          ?.scrollIntoView({
            behavior: 'smooth',
          });
      }, 150);
    }

    // clear cache when leave page
    return () => {
      sessionStorage.removeItem('SELECTED_WALLET_TYPE');
    };
  }, []);

  const checkQRBasedWallet = async (item: IWalletBrandContent) => {
    const { allowed, brand } = await wallet.checkQRHardwareAllowImport(
      item.brand
    );

    if (!allowed) {
      Modal.error({
        title: t('page.newAddress.unableToImport.title'),
        content: t('page.newAddress.unableToImport.description', [brand]),
        okText: t('global.ok'),
        centered: true,
        maskClosable: true,
        className: 'text-center modal-support-darkmode',
      });
      return false;
    }

    return true;
  };

  type Valueof<T> = T[keyof T];
  const connectRouter1 = React.useCallback(
    (
      history,
      item: Valueof<typeof WALLET_BRAND_CONTENT>,
      params?: {
        address: string;
        chainId: number;
      }
    ) => {
      if (item.connectType === 'BitBox02Connect') {
        openInternalPageInTab('import/hardware?connectType=BITBOX02');
      } else if (item.connectType === 'GridPlusConnect') {
        openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
      } else if (item.connectType === 'TrezorConnect') {
        openInternalPageInTab('import/hardware?connectType=TREZOR');
      } else if (item.connectType === 'LedgerConnect') {
        openInternalPageInTab('import/hardware/ledger-connect');
      } else if (item.connectType === 'OneKeyConnect') {
        openInternalPageInTab('import/hardware?connectType=ONEKEY');
      } else if (item.connectType === 'GnosisConnect') {
        history.push({
          pathname: '/import/gnosis',
        });
      } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.QRCodeBase) {
        checkQRBasedWallet(item).then((success) => {
          if (!success) return;
          /**
           * Check if the wallet brand is Keystone. Although Keystone supports both USB signing and import,
           * due to its dual-mode (QR and USB) design, it is still limited to import only one QR wallet at a time.
           */
          if (item.brand === WALLET_BRAND_TYPES.KEYSTONE) {
            openInternalPageInTab('import/hardware/keystone');
            return;
          }
          openInternalPageInTab(`import/hardware/qrcode?brand=${item.brand}`);
        });
      } else if (
        item.connectType === BRAND_WALLET_CONNECT_TYPE.CoboArgusConnect
      ) {
        history.push({
          pathname: '/import/cobo-argus',
          state: params,
        });
      } else if (
        item.connectType === BRAND_WALLET_CONNECT_TYPE.CoinbaseConnect
      ) {
        history.push({
          pathname: '/import/coinbase',
          state: params,
        });
      } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.ImKeyConnect) {
        openInternalPageInTab('import/hardware/imkey-connect');
      } else {
        history.push({
          pathname: '/import/wallet-connect',
          state: {
            brand: item,
          },
        });
      }
    },
    []
  );
  const connectRouter = (
    item: Valueof<typeof WALLET_BRAND_CONTENT>,
    params?: {
      address: string;
      chainId: number;
    }
  ) => handleRouter((h) => connectRouter1(h, item, params));
  const brandWallet = React.useMemo(
    () =>
      (Object.values(WALLET_BRAND_CONTENT)
        .map((item) => {
          if (item.hidden) return;
          return {
            leftIcon: item.image,
            content: item.name,
            brand: item.brand,
            connectType: item.connectType,
            image: item.image,
            onClick: () => connectRouter(item),
            category: item.category,
          };
        })
        .filter(Boolean) as any).sort(
        (a, b) => getSortNum(a.brand) - getSortNum(b.brand)
      ),
    [t, connectRouter]
  );

  const wallets = React.useMemo(() => _.groupBy(brandWallet, 'category'), [
    brandWallet,
  ]);

  const renderList = React.useMemo(
    () =>
      [
        {
          title: t('page.newAddress.connectHardwareWallets'),
          key: WALLET_BRAND_CATEGORY.HARDWARE,
          icon: RcIconHardWallet,
        },
        {
          title: t('page.newAddress.connectMobileWalletApps'),
          key: WALLET_BRAND_CATEGORY.MOBILE,
          icon: RcIconMobileWallet,
        },
        {
          title: t('page.newAddress.connectInstitutionalWallets'),
          key: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
          icon: RcInstitutionalWallet,
        },
      ]
        .map((item) => {
          return {
            ...item,
            values: wallets[item.key],
          };
        })
        .filter((item) => item.values),
    [wallets]
  );

  const hadSeedPhrase = useHadSeedPhrase();

  const createImportAddrList = React.useMemo(
    () =>
      hadSeedPhrase
        ? [
            {
              leftIcon: IconAddFromCurrentSeedPhrase,
              content: t('page.newAddress.addFromCurrentSeedPhrase'),
              brand: 'AddAddressFromCurrentSeedPhrase',
              onClick: () => {
                handleRouter((history) => {
                  history.push('/import/add-from-current-seed-phrase');
                });
              },
            },
            {
              leftIcon: RcIconCreatenewaddr,
              content: t('page.newAddress.createNewSeedPhrase'),
              brand: 'createAddress',
              onClick: () => {
                handleRouter(() => openInternalPageInTab('mnemonics/create'));
              },
            },
          ]
        : [
            {
              leftIcon: RcIconCreatenewaddr,
              content: t('page.newAddress.createNewSeedPhrase'),
              brand: 'createAddress',
              onClick: () => {
                handleRouter(() => openInternalPageInTab('mnemonics/create'));
              },
            },
          ],
    [t, hadSeedPhrase]
  );

  const centerList = React.useMemo(
    () => [
      {
        leftIcon: RcIconMnemonics,
        brand: 'importSeedPhrase',
        content: t('page.newAddress.importSeedPhrase'),
        onClick: () =>
          handleRouter(() => openInternalPageInTab('import/mnemonics')),
      },
      {
        leftIcon: RcIconPrivatekey,
        brand: 'importPrivatekey',
        content: t('page.newAddress.importPrivateKey'),
        onClick: () => handleRouter((history) => history.push('/import/key')),
      },
      {
        leftIcon: IconMetamask,
        brand: 'addMetaMaskAccount',
        content: t('page.newAddress.importMyMetamaskAccount'),
        onClick: () =>
          handleRouter((history) => history.push('/import/metamask')),
      },
    ],
    []
  );

  const bottomList = React.useMemo(
    () => [
      {
        leftIcon: RcIconAddwatchmodo,
        brand: 'addWatchMode',
        content: t('page.newAddress.addContacts.content'),
        subText: t('page.newAddress.addContacts.description'),
        onClick: () =>
          handleRouter((history) => history.push('/import/watch-address')),
      },
    ],
    [t]
  );

  const [preventMount, setPreventMount] = React.useState(true);
  React.useEffect(() => {
    if (location.state) {
      const { type, address, chainId } = location.state as any;
      const brandContentKey = Object.keys(WALLET_BRAND_CONTENT).find((key) => {
        const item = WALLET_BRAND_CONTENT[key] as IWalletBrandContent;
        return item.name === type;
      });

      if (brandContentKey) {
        connectRouter(WALLET_BRAND_CONTENT[brandContentKey], {
          address,
          chainId,
        });
      } else {
        setPreventMount(false);
      }
    } else {
      setPreventMount(false);
    }
  }, [location.state, connectRouter]);

  if (preventMount) return null;

  return (
    <div className="rabby-container pb-[12px]" ref={rootRef}>
      {[createImportAddrList, centerList].map((items, index) => (
        <div
          className="bg-r-neutral-card-1 rounded-[6px] mb-[12px]"
          key={index}
        >
          {items.map((e) => {
            return (
              <Item
                key={e.brand}
                bgColor="transparent"
                leftIcon={e.leftIcon}
                onClick={e.onClick}
              >
                <div className="pl-[12px] text-13 leading-[15px] text-r-neutral-title-1 font-medium">
                  {e.content}
                </div>
              </Item>
            );
          })}
        </div>
      ))}

      <div className="bg-r-neutral-card-1 rounded-[6px] mb-[12px]">
        {renderList.map((item) => {
          const isSelected = selectedWalletType === item.key;
          return (
            <div key={item.key} className={clsx(isSelected && 'pb-[16px]')}>
              <Item
                hoverBorder={false}
                bgColor="transparent"
                leftIcon={item.icon}
                className={clsx('bg-transparent', item.key)}
                rightIconClassName={clsx(
                  'ml-[8px] transition-transform',
                  isSelected ? '-rotate-90' : 'rotate-90'
                )}
                onClick={() => {
                  setSelectedWalletType((v) =>
                    v === item.key ? '' : item.key
                  );
                }}
              >
                <div className="pl-[12px] text-13 leading-[15px] text-r-neutral-title-1 font-medium">
                  {item.title}
                </div>
                <div className="ml-auto relative w-[52px] h-[20px]">
                  {item.values.slice(0, 3).map((wallet, i) => (
                    <ThemeIcon
                      key={wallet.image}
                      src={wallet.leftIcon || wallet.image}
                      className="absolute top-0 w-[20px] h-[20px] select-none"
                      onDragStart={() => false}
                      style={{
                        left: 0 + 16 * i,
                      }}
                    />
                  ))}
                </div>
              </Item>
              <div
                className={clsx(
                  'mx-[16px] bg-r-neutral-card-2 rounded-[6px] transition-all overflow-hidden',
                  !isSelected ? 'max-h-0' : 'max-h-[500px]'
                )}
              >
                <div className="py-[8px] grid grid-cols-3 gap-x-0">
                  {item.values.map((v) => {
                    return (
                      <Item
                        bgColor="transparent"
                        className="flex-col justify-center hover:border-transparent"
                        py={10}
                        px={0}
                        key={v.brand}
                        left={
                          <div className="relative w-[28px] h-[28px]">
                            <img src={v.image} className="w-[28px] h-[28px]" />
                            {v.connectType === 'WalletConnect' &&
                              v.brand !== WALLET_BRAND_TYPES.WALLETCONNECT && (
                                <img
                                  src={IconWalletConnect}
                                  className="absolute -bottom-6 -right-6 w-[14px] h-[14px] rounded-full"
                                />
                              )}
                          </div>
                        }
                        rightIcon={null}
                        onClick={v.onClick}
                      >
                        <span className="text-12 font-medium text-r-neutral-title-1 mt-[8px]">
                          {v.content}
                        </span>
                      </Item>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-r-neutral-card-1 rounded-[6px]">
        {bottomList.map((e) => {
          return (
            <Item
              bgColor="transparent"
              key={e.brand}
              leftIcon={e.leftIcon}
              onClick={e.onClick}
            >
              <div className="flex flex-col pl-[12px]">
                <div className="text-13 leading-[15px] text-r-neutral-title-1 font-medium">
                  {e.content}
                </div>
                <div className="text-12 text-r-neutral-body">{e.subText}</div>
              </div>
            </Item>
          );
        })}
      </div>
    </div>
  );
};

export default connectStore()(AddAddressOptions);
