import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconWalletConnect from 'ui/assets/walletlogo/walletconnect.svg';
import IconCreatenewaddr from 'ui/assets/walletlogo/createnewaddr.svg';
import IconAddwatchmodo from 'ui/assets/walletlogo/addwatchmode.svg';
import IconHardWallet from 'ui/assets/address/hardwallet.svg';
import IconMobileWallet from 'ui/assets/address/mobile-wallet.svg';
import InstitutionalWallet from 'ui/assets/address/institutional-wallet.svg';
import IconMetamask from 'ui/assets/dashboard/icon-metamask.svg';
import IconMnemonics from 'ui/assets/import/mnemonics-light.svg';
import IconPrivatekey from 'ui/assets/import/privatekey-light.svg';

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

const getSortNum = (s: string) => WALLET_SORT_SCORE[s] || 999999;

const AddAddressOptions = () => {
  const history = useHistory();
  const { t } = useTranslation();

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
        className: 'text-center',
      });
      return false;
    }

    return true;
  };

  type Valueof<T> = T[keyof T];
  const connectRouter1 = React.useCallback(
    (history, item: Valueof<typeof WALLET_BRAND_CONTENT>) => {
      if (item.connectType === 'BitBox02Connect') {
        openInternalPageInTab('import/hardware?connectType=BITBOX02');
      } else if (item.connectType === 'GridPlusConnect') {
        openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
      } else if (item.connectType === 'TrezorConnect') {
        openInternalPageInTab('import/hardware?connectType=TREZOR');
      } else if (item.connectType === 'LedgerConnect') {
        openInternalPageInTab(
          IS_CHROME
            ? 'import/hardware/ledger-connect'
            : 'import/hardware/ledger'
        );
      } else if (item.connectType === 'OneKeyConnect') {
        openInternalPageInTab('import/hardware?connectType=ONEKEY');
      } else if (item.connectType === 'GnosisConnect') {
        history.push({
          pathname: '/import/gnosis',
        });
      } else if (item.connectType === BRAND_WALLET_CONNECT_TYPE.QRCodeBase) {
        checkQRBasedWallet(item).then((success) => {
          if (!success) return;
          openInternalPageInTab(`import/hardware/qrcode?brand=${item.brand}`);
        });
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
  const connectRouter = (item: Valueof<typeof WALLET_BRAND_CONTENT>) =>
    handleRouter((h) => connectRouter1(h, item));
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
          icon: IconHardWallet,
        },
        {
          title: t('page.newAddress.connectMobileWalletApps'),
          key: WALLET_BRAND_CATEGORY.MOBILE,
          icon: IconMobileWallet,
        },
        {
          title: t('page.newAddress.connectInstitutionalWallets'),
          key: WALLET_BRAND_CATEGORY.INSTITUTIONAL,
          icon: InstitutionalWallet,
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

  const createIMportAddrList = React.useMemo(
    () => [
      {
        leftIcon: IconCreatenewaddr,
        content: t('page.newAddress.createNewSeedPhrase'),
        brand: 'createAddress',
        onClick: () => {
          handleRouter(() => openInternalPageInTab('mnemonics/create'));
        },
      },
    ],
    [t]
  );

  const centerList = React.useMemo(
    () => [
      {
        leftIcon: IconMnemonics,
        brand: 'importSeedPhrase',
        content: t('page.newAddress.importSeedPhrase'),
        onClick: () =>
          handleRouter(() => openInternalPageInTab('import/mnemonics')),
      },
      {
        leftIcon: IconPrivatekey,
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
        leftIcon: IconAddwatchmodo,
        brand: 'addWatchMode',
        content: t('page.newAddress.addContacts.content'),
        subText: t('page.newAddress.addContacts.description'),
        onClick: () =>
          handleRouter((history) => history.push('/import/watch-address')),
      },
    ],
    [t]
  );

  return (
    <div className="rabby-container pb-[12px]" ref={rootRef}>
      {[createIMportAddrList, centerList].map((items, index) => (
        <div className="bg-white rounded-[6px] mb-[12px]" key={index}>
          {items.map((e) => {
            return (
              <Item key={e.brand} leftIcon={e.leftIcon} onClick={e.onClick}>
                <div className="pl-[12px] text-13 leading-[15px] text-gray-title font-medium">
                  {e.content}
                </div>
              </Item>
            );
          })}
        </div>
      ))}

      <div className="bg-white rounded-[6px] mb-[12px]">
        {renderList.map((item) => {
          const isSelected = selectedWalletType === item.key;
          return (
            <div key={item.key} className={clsx(isSelected && 'pb-[16px]')}>
              <Item
                hoverBorder={false}
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
                <div className="pl-[12px] text-13 leading-[15px] text-gray-title font-medium">
                  {item.title}
                </div>
                <div className="ml-auto relative w-[52px] h-[20px]">
                  {item.values.slice(0, 3).map((wallet, i) => (
                    <img
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
                  'mx-[16px] bg-gray-bg2 rounded-[6px] transition-all  overflow-hidden',
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
                            <img
                              src={v.image}
                              className="w-[28px] h-[28px] rounded-full"
                            />
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
                        <span className="text-12 font-medium text-gray-title mt-[8px]">
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

      <div className="bg-white rounded-[6px]">
        {bottomList.map((e) => {
          return (
            <Item key={e.brand} leftIcon={e.leftIcon} onClick={e.onClick}>
              <div className="flex flex-col pl-[12px]">
                <div className=" text-13 leading-[15px] text-gray-title font-medium">
                  {e.content}
                </div>
                <div className="text-12 text-gray-subTitle">{e.subText}</div>
              </div>
            </Item>
          );
        })}
      </div>
    </div>
  );
};

export default connectStore()(AddAddressOptions);
