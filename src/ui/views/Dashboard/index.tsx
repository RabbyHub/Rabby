import { Input, message, Popover } from 'antd';
import { AssetItem, TokenItem } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { useTranslation, Trans } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { matomoRequestEvent } from '@/utils/matomo-request';
import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_ICONS_WHITE,
  KEYRING_TYPE,
  KEYRING_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
  EVENTS,
} from 'consts';
import cloneDeep from 'lodash/cloneDeep';
import uniqBy from 'lodash/uniqBy';
import QRCode from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import { FixedSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconAddToken from 'ui/assets/addtoken.png';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconEditPen from 'ui/assets/editpen.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy.svg';

import IconSuccess from 'ui/assets/success.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import { AddressViewer, Modal, NameAndAddress } from 'ui/component';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import { isSameAddress, useWallet } from 'ui/utils';
import {
  AssetsList,
  BalanceView,
  ChainAndSiteSelector,
  GnosisWrongChainAlertBar,
  NFTListContainer,
  TokenList,
  ExtraLink,
  DefaultWalletSetting,
} from './components';
import Dropdown from './components/NFT/Dropdown';
import './style.less';

import PendingApproval from './components/PendingApproval';
import PendingTxs from './components/PendingTxs';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { getKRCategoryByType } from '@/utils/transaction';
import eventBus from '@/eventBus';

import { ReactComponent as IconAddAddress } from '@/ui/assets/address/add-address.svg';
import { ReactComponent as IconArrowRight } from 'ui/assets/dashboard/arrow-right.svg';
import Queue from './components/Queue';
import { copyAddress } from '@/ui/utils/clipboard';
import { SessionSignal } from '@/ui/component/WalletConnect/SessionSignal';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { GridPlusSignal } from '@/ui/component/ConnectStatus/GridPlusSignal';
import { LedgerSignal } from '@/ui/component/ConnectStatus/LedgerSignal';
import { useRequest } from 'ahooks';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { useGnosisPendingTxs } from '@/ui/hooks/useGnosisPendingTxs';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';

const GnosisAdminItem = ({
  accounts,
  address,
}: {
  accounts: Account[];
  address: string;
}) => {
  const addressInWallet = accounts.find((account) =>
    isSameAddress(account.address, address)
  );
  return (
    <li>
      <NameAndAddress address={address} nameClass="max-143" />
      {addressInWallet ? (
        <img src={IconTagYou} className="icon icon-tag" />
      ) : (
        <></>
      )}
    </li>
  );
};

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const fixedList = useRef<FixedSizeList>();

  const {
    alianName,
    currentAccount,
    accountsList,
    loadingAccounts,
    highlightedAddresses,
  } = useRabbySelector((s) => ({
    alianName: s.account.alianName,
    currentAccount: s.account.currentAccount,
    accountsList: s.accountToDisplay.accountsList,
    loadingAccounts: s.accountToDisplay.loadingAccounts,
    highlightedAddresses: s.addressManagement.highlightedAddresses,
  }));

  const { pendingTransactionCount: pendingTxCount } = useRabbySelector((s) => ({
    ...s.transactions,
  }));

  const { firstNotice, updateContent } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));

  const { sortedAccountsList } = React.useMemo(() => {
    const restAccounts = [...accountsList];
    let highlightedAccounts: typeof accountsList = [];

    highlightedAddresses.forEach((highlighted) => {
      const idx = restAccounts.findIndex(
        (account) =>
          account.address === highlighted.address &&
          account.brandName === highlighted.brandName
      );
      if (idx > -1) {
        highlightedAccounts.push(restAccounts[idx]);
        restAccounts.splice(idx, 1);
      }
    });

    highlightedAccounts = sortAccountsByBalance(highlightedAccounts);

    return {
      sortedAccountsList: highlightedAccounts.concat(restAccounts),
    };
  }, [accountsList, highlightedAddresses]);

  const [copySuccess, setCopySuccess] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [startEdit, setStartEdit] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [showChain, setShowChain] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showNFT, setShowNFT] = useState(false);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [searchTokens, setSearchTokens] = useState<TokenItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [startSearch, setStartSearch] = useState(false);
  const [addedToken, setAddedToken] = useState<string[]>([]);
  const [defiAnimate, setDefiAnimate] = useState('fadeOut');
  const [nftAnimate, setNFTAnimate] = useState('fadeOut');
  const [tokenAnimate, setTokenAnimate] = useState('fadeOut');
  const [topAnimate, setTopAnimate] = useState('');
  const [connectionAnimation, setConnectionAnimation] = useState('');
  const [nftType, setNFTType] = useState<'collection' | 'nft'>('collection');
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [accountBalanceUpdateNonce, setAccountBalanceUpdateNonce] = useState(0);

  const [startAnimate, setStartAnimate] = useState(false);
  const isGnosis = useRabbyGetter((s) => s.chains.isCurrentAccountGnosis);
  const gnosisPendingCount = useRabbySelector(
    (s) => s.chains.gnosisPendingCount
  );
  const [isListLoading, setIsListLoading] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);

  const [dashboardReload, setDashboardReload] = useState(false);
  const getCurrentAccount = async () => {
    const account = await dispatch.account.getCurrentAccountAsync();
    if (!account) {
      history.replace('/no-address');
      return;
    }
  };

  useInterval(() => {
    if (!currentAccount) return;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) return;

    dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
  }, 30000);

  useEffect(() => {
    getCurrentAccount();
  }, []);

  useGnosisNetworks(
    {
      address:
        currentAccount?.address &&
        currentAccount?.type === KEYRING_TYPE.GnosisKeyring
          ? currentAccount.address
          : '',
    },
    {
      onBefore() {
        dispatch.chains.setField({
          gnosisNetworkIds: [],
        });
      },
      onSuccess(res) {
        if (res) {
          dispatch.chains.setField({
            gnosisNetworkIds: res,
          });
        }
      },
    }
  );

  useGnosisPendingTxs(
    {
      address:
        currentAccount?.address &&
        currentAccount?.type === KEYRING_TYPE.GnosisKeyring
          ? currentAccount.address
          : '',
    },
    {
      onBefore() {
        dispatch.chains.setField({
          gnosisPendingCount: 0,
        });
      },
      onSuccess(res) {
        dispatch.chains.setField({
          gnosisPendingCount: res?.total || 0,
        });
      },
    }
  );

  useEffect(() => {
    if (currentAccount) {
      if (currentAccount.type !== KEYRING_TYPE.GnosisKeyring) {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }

      wallet
        .getAlianName(currentAccount?.address.toLowerCase())
        .then((name) => {
          dispatch.account.setField({ alianName: name });
          setDisplayName(name!);
        });

      eventBus.addEventListener(EVENTS.TX_COMPLETED, async ({ address }) => {
        if (isSameAddress(address, currentAccount.address)) {
          const count = await dispatch.transactions.getPendingTxCountAsync(
            currentAccount.address
          );
          if (count === 0) {
            setTimeout(() => {
              // increase accountBalanceUpdateNonce to trigger useCurrentBalance re-fetch account balance
              // delay 5s for waiting db sync data
              setAccountBalanceUpdateNonce(accountBalanceUpdateNonce + 1);
            }, 5000);
          }
        }
      });
    }
    return () => {
      eventBus.removeAllEventListeners(EVENTS.TX_COMPLETED);
    };
  }, [currentAccount]);

  useEffect(() => {
    if (dashboardReload) {
      if (currentAccount) {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }
      setDashboardReload(false);
      getCurrentAccount();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    }
  }, [dashboardReload]);

  useEffect(() => {
    (async () => {
      await dispatch.addressManagement.getHilightedAddressesAsync();
      dispatch.accountToDisplay.getAllAccountsToDisplay();
      const pendingCount = await wallet.getPendingApprovalCount();
      setPendingApprovalCount(pendingCount);
    })();
  }, []);

  useEffect(() => {
    if (clicked) {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    }
  }, [clicked]);
  const handleChange = async (account: Account) => {
    setIsListLoading(true);
    setIsAssetsLoading(true);
    await dispatch.account.changeAccountAsync(account);
    hide();
  };

  const handleCopyCurrentAddress = () => {
    const clipboard = new ClipboardJS('.address-popover', {
      text: function () {
        return currentAccount!.address;
      },
    });
    clipboard.on('success', () => {
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 1000);
      message.success({
        duration: 3,
        icon: <i />,
        content: (
          <div>
            <div className="flex gap-4 mb-4">
              <img src={IconSuccess} alt="" />
              Copied
            </div>
            <div className="text-white">{currentAccount!.address}</div>
          </div>
        ),
      });
      matomoRequestEvent({
        category: 'AccountInfo',
        action: 'popupCopyAddress',
        label: [
          getKRCategoryByType(currentAccount?.type),
          currentAccount?.brandName,
        ].join('|'),
      });
      clipboard.destroy();
    });
  };

  const handleAlianNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    dispatch.account.setField({ alianName: e.target.value });
  };

  const alianNameConfirm = async (e) => {
    e.stopPropagation();
    if (!alianName) {
      return;
    }
    setStartEdit(false);
    await wallet.updateAlianName(
      currentAccount?.address?.toLowerCase() || '',
      alianName
    );
    setDisplayName(alianName);
    const newAccountList = accountsList.map((item) => {
      if (
        item.address.toLowerCase() === currentAccount?.address.toLowerCase()
      ) {
        return {
          ...item,
          alianName: alianName,
        };
      }
      return item;
    });
    if (newAccountList.length > 0) {
      dispatch.accountToDisplay.setField({ accountsList: newAccountList });
    }
  };

  const sortTokensByPrice = (tokens: TokenItem[]) => {
    const copy = cloneDeep(tokens);
    return copy.sort((a, b) => {
      return new BigNumber(b.amount)
        .times(new BigNumber(b.price || 0))
        .minus(new BigNumber(a.amount).times(new BigNumber(a.price || 0)))
        .toNumber();
    });
  };
  const sortAssetsByUSDValue = (assets: AssetItem[]) => {
    const copy = cloneDeep(assets);
    return copy.sort((a, b) => {
      return new BigNumber(b.net_usd_value)
        .minus(new BigNumber(a.net_usd_value))
        .toNumber();
    });
  };

  const handleLoadTokens = async (q?: string) => {
    let tokens: TokenItem[] = [];
    if (q) {
      if (q.length !== 42 || !q.startsWith('0x')) return [];
      tokens = sortTokensByPrice(
        await wallet.openapi.searchToken(currentAccount?.address || '', q)
      );
      setSearchTokens(tokens);
    } else {
      setIsListLoading(true);
      const defaultTokens = await wallet.openapi.listToken(
        currentAccount?.address || ''
      );
      const localAdded =
        (await wallet.getAddedToken(currentAccount?.address || '')) || [];
      const localAddedTokens = await wallet.openapi.customListToken(
        localAdded,
        currentAccount?.address || ''
      );
      const addedToken = localAdded
        .map((item) => {
          if (item.includes(':')) {
            return item.split(':')[1];
          }
        })
        .filter((item): item is string => item != undefined);
      setAddedToken(addedToken);
      tokens = sortTokensByPrice(
        uniqBy([...defaultTokens, ...localAddedTokens], (token) => {
          return `${token.chain}-${token.id}`;
        })
      );
      setTokens(tokens);
      setIsListLoading(false);
    }
  };

  const handleLoadAssets = async () => {
    setIsAssetsLoading(true);
    const assets = sortAssetsByUSDValue(
      await wallet.listChainAssets(currentAccount?.address || '')
    );
    setAssets(assets);
    setIsAssetsLoading(false);
  };

  const gotoAddAddress = () => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Add Address',
    });
    history.push('/add-address');
  };
  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, []);
  useEffect(() => {
    if (currentAccount) {
      setTokens([]);
      setAssets([]);
    }
  }, [currentAccount]);

  const hide = () => {
    setStartEdit(false);
    setClicked(false);
    setHovered(false);
  };
  const displayTokenList = () => {
    if (tokens.length === 0) {
      handleLoadTokens();
    }
    if (showToken) {
      setStartSearch(false);
      setTokenAnimate('fadeOut');
      setDefiAnimate('fadeOut');
      setConnectionAnimation('fadeInBottom');
      setShowToken(false);
      setShowChain(false);
      setShowNFT(false);
      setTopAnimate('fadeInTop');
    } else {
      if (showAssets) {
        setTokenAnimate('fadeInLeft');
        setDefiAnimate('fadeOutRight');
      } else if (showNFT) {
        setTokenAnimate('fadeInLeft');
        setNFTAnimate('fadeOutRight');
      } else {
        setTokenAnimate('fadeIn');
      }
      setStartAnimate(true);
      setShowToken(true);
      setShowChain(true);
      setTopAnimate('fadeOutTop');
      setConnectionAnimation('fadeOutBottom');
    }
    setStartSearch(false);
    setShowAssets(false);
    setShowNFT(false);
  };
  const displayAssets = () => {
    if (assets.length === 0) {
      handleLoadAssets();
    }
    if (showAssets) {
      setShowNFT(false);
      setShowAssets(false);
      setShowChain(false);
      setTopAnimate('fadeInTop');
      setTokenAnimate('fadeOut');
      setDefiAnimate('fadeOut');
      setConnectionAnimation('fadeInBottom');
    } else {
      if (showToken) {
        setDefiAnimate('fadeInRight');
        setTokenAnimate('fadeOutLeft');
      } else if (showNFT) {
        setDefiAnimate('fadeInLeft');
        setNFTAnimate('fadeOutRight');
      } else {
        setDefiAnimate('fadeIn');
      }
      setStartAnimate(true);
      setShowAssets(true);
      setShowChain(true);
      setTopAnimate('fadeOutTop');
      setConnectionAnimation('fadeOutBottom');
    }
    setShowToken(false);
    setShowNFT(false);
  };
  const displayNFTs = () => {
    if (showNFT) {
      setShowNFT(false);
      setShowAssets(false);
      setShowChain(false);
      setTopAnimate('fadeInTop');
      setTokenAnimate('fadeOut');
      setDefiAnimate('fadeOut');
      setNFTAnimate('fadeOut');
      setConnectionAnimation('fadeInBottom');
    } else {
      if (showToken) {
        setNFTAnimate('fadeInRight');
        setTokenAnimate('fadeOutLeft');
      } else if (showAssets) {
        setNFTAnimate('fadeInRight');
        setDefiAnimate('fadeOutLeft');
      } else {
        setNFTAnimate('fadeIn');
      }
      setStartAnimate(true);
      setShowAssets(true);
      setShowChain(true);
      setShowNFT(true);
      setTopAnimate('fadeOutTop');
      setConnectionAnimation('fadeOutBottom');
    }
    setShowToken(false);
    setShowAssets(false);
  };
  const hideAllList = () => {
    if (showAssets) {
      setDefiAnimate('fadeOut');
    }
    if (showToken) {
      setTokenAnimate('fadeOut');
    }
    if (showNFT) {
      setNFTAnimate('fadeOut');
    }
    setStartSearch(false);
    setShowAssets(false);
    setShowChain(false);
    setShowToken(false);
    setShowNFT(false);
    setConnectionAnimation('fadeInBottom');
    setTopAnimate('fadeInTop');
  };
  const removeToken = async (token: TokenItem) => {
    const uuid = `${token?.chain}:${token?.id}`;
    const localAdded =
      (await wallet.getAddedToken(currentAccount?.address || '')) || [];
    const newAddTokenSymbolList = localAdded.filter((item) => item !== uuid);
    await wallet.updateAddedToken(
      currentAccount?.address || '',
      newAddTokenSymbolList
    );
    const removeNewTokens = tokens.filter((item) => item.id !== token?.id);
    const newAddedTokens = addedToken.filter((item) => item !== token?.id);
    setTokens(removeNewTokens);
    setAddedToken(newAddedTokens);
  };
  const addToken = async (newAddToken: TokenItem) => {
    const newAddTokenList = [...addedToken, newAddToken?.id];
    const uuid = `${newAddToken?.chain}:${newAddToken?.id}`;
    const localAdded =
      (await wallet.getAddedToken(currentAccount?.address || '')) || [];
    setAddedToken(newAddTokenList);
    await wallet.updateAddedToken(currentAccount?.address || '', [
      ...localAdded,
      uuid,
    ]);
    const newTokenList = [...tokens, newAddToken];
    setTokens(sortTokensByPrice(newTokenList));
  };

  useEffect(() => {
    if (!showNFT) {
      setNFTType('collection');
    }
  }, [showNFT]);
  const showGnosisWrongChainAlert = useRabbyGetter(
    (s) => s.chains.isShowGnosisWrongChainAlert
  );
  const opacity60 =
    currentAccount?.type === KEYRING_CLASS.MNEMONIC ||
    currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY ||
    currentAccount?.type === KEYRING_CLASS.WATCH;
  const showGnosisAlert = isGnosis && showGnosisWrongChainAlert && !showChain;

  const switchAddress = () => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Change Address',
    });
    history.push('/switch-address');
  };

  const brandIcon = useWalletConnectIcon(currentAccount);

  return (
    <>
      <div
        className={clsx('dashboard', {
          'metamask-active': showGnosisWrongChainAlert && isGnosis,
        })}
      >
        <div className={clsx('main', showChain && 'show-chain-bg')}>
          {currentAccount && (
            <div
              className={clsx('flex header items-center relative', topAnimate)}
            >
              <div
                className="h-[36px] flex header-wrapper items-center relative"
                onClick={switchAddress}
              >
                <Popover
                  content={null}
                  trigger="click"
                  visible={false}
                  placement="bottomLeft"
                  overlayClassName="switch-popover"
                >
                  <div className="relative mr-[4px]">
                    <img
                      className={clsx(
                        'icon w-[24px] h-[24px]',
                        opacity60 && 'opacity-60'
                      )}
                      src={
                        brandIcon ||
                        WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
                        KEYRING_ICONS_WHITE[currentAccount.type]
                      }
                    />
                    <CommonSignal
                      type={currentAccount.type}
                      brandName={currentAccount.brandName}
                      address={currentAccount.address}
                    />
                  </div>
                  <div
                    className="text-15 text-white ml-6 mr-6 dashboard-name"
                    title={displayName}
                  >
                    {displayName}
                  </div>
                  <div className="current-address">
                    {currentAccount && (
                      <AddressViewer
                        address={currentAccount.address}
                        showArrow={false}
                        className={'text-12 text-white opacity-60'}
                      />
                    )}
                  </div>
                  <IconArrowRight className="ml-8" />
                </Popover>
              </div>

              <RcIconCopy
                className="copyAddr"
                onClick={() => {
                  copyAddress(currentAccount.address);
                  matomoRequestEvent({
                    category: 'AccountInfo',
                    action: 'headCopyAddress',
                    label: [
                      getKRCategoryByType(currentAccount?.type),
                      currentAccount?.brandName,
                    ].join('|'),
                  });
                }}
              />

              <div
                className="ml-auto w-[36px] h-[36px] bg-white bg-opacity-[0.12] hover:bg-opacity-[0.3] backdrop-blur-[20px] rounded-[6px] flex items-center justify-center cursor-pointer"
                role="button"
                onClick={gotoAddAddress}
              >
                <IconAddAddress className="text-white w-[20px] h-[20px]" />
              </div>
            </div>
          )}
          <BalanceView
            currentAccount={currentAccount}
            showChain={showChain}
            startAnimate={startAnimate}
            accountBalanceUpdateNonce={accountBalanceUpdateNonce}
            onClick={() => {
              if (!showToken && !showAssets && !showNFT) {
                matomoRequestEvent({
                  category: 'ViewAssets',
                  action: 'openTotal',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                  ].join('|'),
                });
                displayTokenList();
              } else {
                matomoRequestEvent({
                  category: 'ViewAssets',
                  action: 'closeTotal',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                  ].join('|'),
                });
                setStartSearch(false);
                setShowToken(false);
                setShowAssets(false);
                setShowChain(false);
                setShowNFT(false);
                setTokenAnimate('fadeOut');
                setDefiAnimate('fadeOut');
                setNFTAnimate('fadeOut');
                setConnectionAnimation('fadeInBottom');
                setTopAnimate('fadeInTop');
              }
            }}
          />
          {isGnosis ? (
            <Queue
              count={gnosisPendingCount || 0}
              className={clsx(
                'transition-opacity',
                showChain ? 'opacity-0 pointer-events-none' : 'opacity-100'
              )}
            />
          ) : (
            pendingTxCount > 0 &&
            !showChain && <PendingTxs pendingTxCount={pendingTxCount} />
          )}
          <div className={clsx('listContainer', showChain && 'mt-10')}>
            <div
              className={clsx('token', showToken && 'showToken')}
              onClick={() => {
                matomoRequestEvent({
                  category: 'ViewAssets',
                  action: 'clickHeadToken',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                    !showToken ? 'open' : 'close',
                  ].join('|'),
                });
                displayTokenList();
              }}
            >
              Token
            </div>
            <div
              className={clsx('token', showAssets && 'showToken')}
              onClick={() => {
                matomoRequestEvent({
                  category: 'ViewAssets',
                  action: 'clickHeadDefi',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                    !showAssets ? 'open' : 'close',
                  ].join('|'),
                });
                displayAssets();
              }}
            >
              DeFi
            </div>
            <div
              className={clsx('token', showNFT && 'showToken')}
              onClick={() => {
                matomoRequestEvent({
                  category: 'ViewAssets',
                  action: 'clickHeadNFT',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                    !showNFT ? 'open' : 'close',
                  ].join('|'),
                });
                displayNFTs();
              }}
            >
              NFT
            </div>
            {!(showNFT || showToken || showAssets) && (
              <ExtraLink
                address={currentAccount?.address as string}
              ></ExtraLink>
            )}
            {showToken ? (
              !startSearch ? (
                <img
                  src={IconAddToken}
                  onClick={() => setStartSearch(true)}
                  className="w-[18px] h-[18px] pointer absolute right-0"
                />
              ) : (
                <span
                  onClick={() => setStartSearch(false)}
                  className="text-white text-[12px] underline pointer absolute right-0 opacity-80"
                >
                  Cancel
                </span>
              )
            ) : null}
            {showNFT && (
              <div className="pointer absolute right-0">
                <Dropdown
                  value={nftType}
                  onChange={(nextVal: typeof nftType) => {
                    matomoRequestEvent({
                      category: 'ViewAssets',
                      action: 'switchNFTFilter',
                      label: [
                        getKRCategoryByType(currentAccount?.type),
                        currentAccount?.brandName,
                        nextVal === 'collection' ? 'collections' : 'all',
                      ].join('|'),
                    });
                    setNFTType(nextVal);
                  }}
                />
              </div>
            )}
          </div>
          <TokenList
            tokens={tokens}
            searchTokens={searchTokens}
            addedToken={addedToken}
            startSearch={startSearch}
            removeToken={removeToken}
            addToken={addToken}
            onSearch={handleLoadTokens}
            closeSearch={() => {
              setSearchTokens([]);
              setIsListLoading(false);
              setStartSearch(false);
            }}
            tokenAnimate={tokenAnimate}
            startAnimate={startAnimate}
            isloading={isListLoading}
          />
          <AssetsList
            assets={assets}
            defiAnimate={defiAnimate}
            startAnimate={startAnimate}
            isloading={isAssetsLoading}
          />
          <NFTListContainer
            address={currentAccount?.address}
            animate={nftAnimate}
            startAnimate={startAnimate}
            type={nftType}
          ></NFTListContainer>
        </div>
        <ChainAndSiteSelector
          onChange={(currentConnection) => {
            dispatch.chains.setField({ currentConnection });
          }}
          connectionAnimation={connectionAnimation}
          showDrawer={showToken || showAssets || showNFT}
          hideAllList={hideAllList}
          gnosisPendingCount={gnosisPendingCount}
          isGnosis={isGnosis}
          higherBottom={isGnosis}
          setDashboardReload={() => setDashboardReload(true)}
        />
        {showGnosisAlert && <GnosisWrongChainAlertBar />}
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title="What's new"
        className="first-notice"
        onCancel={() => {
          dispatch.appVersion.afterFirstLogin();
        }}
        maxHeight="420px"
      >
        <ReactMarkdown children={updateContent} remarkPlugins={[remarkGfm]} />
      </Modal>
      <Modal
        visible={hovered}
        closable={false}
        onCancel={() => {
          setHovered(false);
          setStartEdit(false);
        }}
        className="address-popover"
      >
        <div
          className="flex flex-col items-center"
          onClick={() => setStartEdit(false)}
        >
          <div className="address-popover__info">
            <div className="left-container">
              <div className="flex items-center w-[188px]">
                <div className="brand-name">
                  {startEdit ? (
                    <Input
                      value={alianName}
                      defaultValue={alianName}
                      onChange={handleAlianNameChange}
                      onPressEnter={alianNameConfirm}
                      autoFocus={startEdit}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={50}
                      min={0}
                      style={{ zIndex: 10 }}
                    />
                  ) : (
                    <span title={displayName} className="alias">
                      {displayName}
                    </span>
                  )}
                  {!startEdit && (
                    <img
                      className="edit-name"
                      src={IconEditPen}
                      onClick={(e) => {
                        e.stopPropagation();
                        setStartEdit(true);
                      }}
                    />
                  )}
                </div>
                {startEdit && (
                  <img
                    className="edit-name w-[16px] h-[16px]"
                    src={alianName ? IconCorrect : IconUnCorrect}
                    onClick={(e) => {
                      e.stopPropagation();
                      alianNameConfirm(e);
                    }}
                  />
                )}
              </div>
              <div className="address-display">
                {currentAccount?.address.toLowerCase()}{' '}
                <img
                  onClick={handleCopyCurrentAddress}
                  src={IconAddressCopy}
                  id={'copyIcon'}
                  className={clsx(
                    'ml-7 inline-block mb-2  w-[16px] h-[16px] pointer',
                    {
                      success: copySuccess,
                    }
                  )}
                />
              </div>
              <div className="import">
                {currentAccount && (
                  <img
                    className="icon icon-account-type w-[16px] h-[16px] pb-1 inline-block"
                    src={
                      KEYRING_ICONS[currentAccount.type] ||
                      WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
                    }
                  />
                )}{' '}
                {(currentAccount?.type &&
                  KEYRING_TYPE_TEXT[currentAccount?.type]) ||
                  (currentAccount && (
                    <Trans
                      i18nKey="addressTypeTip"
                      values={{
                        type:
                          WALLET_BRAND_CONTENT[currentAccount?.brandName]?.name,
                      }}
                    />
                  ))}
              </div>
            </div>
            <div className="qrcode-container">
              <QRCode value={currentAccount?.address} size={100} />
            </div>
          </div>
          {/* {isGnosis && (
            <div className="address-popover__gnosis">
              <h4 className="text-15 mb-4">Admins</h4>
              {safeInfo ? (
                <>
                  <p className="text-black text-12 mb-8">
                    Any transaction requires the confirmation of{' '}
                    <span className="ml-8 font-medium threshold">
                      {safeInfo.threshold}/{safeInfo.owners.length}
                    </span>
                  </p>
                  <ul className="admin-list">
                    {safeInfo.owners.map((owner, index) => (
                      <GnosisAdminItem
                        address={owner}
                        accounts={sortedAccountsList}
                        key={index}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <div className="loading-wrapper">
                  <SvgIconLoading
                    className="icon icon-loading"
                    fill="#707280"
                  />
                  <p className="text-14 text-gray-light mb-0">
                    Loading address
                  </p>
                </div>
              )}
            </div>
          )} */}
        </div>
      </Modal>
      {!(showToken || showAssets || showNFT) && <DefaultWalletSetting />}
      {pendingApprovalCount > 0 && (
        <PendingApproval
          onRejectAll={() => {
            setPendingApprovalCount(0);
          }}
          count={pendingApprovalCount}
        />
      )}
    </>
  );
};

export default connectStore()(Dashboard);
