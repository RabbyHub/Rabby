import { Input, message, Popover } from 'antd';
import { AssetItem, TokenItem } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { useTranslation, Trans } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactGA from 'react-ga';
import {
  KEYRING_CLASS,
  KEYRING_ICONS,
  KEYRING_ICONS_WHITE,
  KEYRING_TYPE,
  KEYRING_TYPE_TEXT,
  WALLET_BRAND_CONTENT,
} from 'consts';
import cloneDeep from 'lodash/cloneDeep';
import uniqBy from 'lodash/uniqBy';
import QRCode from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useInterval } from 'react-use';
import { FixedSizeList } from 'react-window';
import { SvgIconLoading } from 'ui/assets';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconAddToken from 'ui/assets/addtoken.png';
import IconPlus from 'ui/assets/dashboard-plus.svg';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCopy from 'ui/assets/icon-copy.svg';
import IconInfo from 'ui/assets/information.png';
import IconSuccess from 'ui/assets/success.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconUpAndDown from 'ui/assets/up-and-down.svg';
import { AddressViewer, Copy, Modal, NameAndAddress } from 'ui/component';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import { isSameAddress, useWalletOld } from 'ui/utils';
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

import AddressRow from './components/AddressRow';
import { sortAccountsByBalance } from '@/ui/utils/account';
import { getKRCategoryByType } from '@/utils/transaction';

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
  const { state } = useLocation<{
    connection?: boolean;
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false } = state ?? {};
  const wallet = useWalletOld();
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

  const { gnosisPendingCount, safeInfo } = useRabbySelector((s) => ({
    ...s.chains,
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

  const [startAnimate, setStartAnimate] = useState(false);
  const isGnosis = useRabbyGetter((s) => s.chains.isCurrentAccountGnosis);
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

  useEffect(() => {
    if (currentAccount) {
      if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
        dispatch.chains.setField({
          safeInfo: null,
        });
        dispatch.chains.getGnosisPendingCountAsync();
      } else {
        dispatch.transactions.getPendingTxCountAsync(currentAccount.address);
      }

      wallet
        .getAlianName(currentAccount?.address.toLowerCase())
        .then((name) => {
          dispatch.account.setField({ alianName: name });
          setDisplayName(name);
        });
    }
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
      ReactGA.event({
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
      currentAccount?.address?.toLowerCase(),
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
        await wallet.openapi.searchToken(currentAccount?.address, q)
      );
      setSearchTokens(tokens);
    } else {
      setIsListLoading(true);
      const defaultTokens = await wallet.openapi.listToken(
        currentAccount?.address
      );
      const localAdded =
        (await wallet.getAddedToken(currentAccount?.address)) || [];
      const localAddedTokens = await wallet.openapi.customListToken(
        localAdded,
        currentAccount?.address
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
      await wallet.listChainAssets(currentAccount?.address)
    );
    setAssets(assets);
    setIsAssetsLoading(false);
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

  const clickContent = () => (
    <div className="click-list flex flex-col w-[233px]">
      {loadingAccounts ? (
        <div className="address-loading">
          <SvgIconLoading className="icon icon-loading" fill="#707280" />
          <div className="text-14 text-gray-light">
            {t('Loading Addresses')}
          </div>
        </div>
      ) : sortedAccountsList.length <= 0 ? (
        <div className="no-other-address"> {t('No address')}</div>
      ) : (
        <FixedSizeList
          height={
            sortedAccountsList.length > 5 ? 308 : sortedAccountsList.length * 54
          }
          width="100%"
          itemData={sortedAccountsList}
          itemCount={sortedAccountsList.length}
          itemSize={54}
          ref={fixedList}
          style={{ zIndex: 10 }}
        >
          {(props: {
            data: Account[];
            index: number;
            style: React.StyleHTMLAttributes<HTMLDivElement>;
          }) => {
            return (
              <AddressRow
                data={props.data}
                index={props.index}
                style={props.style}
                copiedSuccess={copySuccess}
                handleClickChange={handleChange}
                onCopy={(account) => {
                  ReactGA.event({
                    category: 'AccountInfo',
                    action: 'selectCopyAddress',
                    label: [
                      getKRCategoryByType(account?.type),
                      account?.brandName,
                    ].join('|'),
                  });
                }}
              />
            );
          }}
        </FixedSizeList>
      )}
      <Link to="/add-address" className="pop-add-address flex items-center">
        {' '}
        <img src={IconPlus} />
        <p className="mb-0 ml-15 lh-1">{t('Add address')}</p>
      </Link>
    </div>
  );

  const handleClickChange = (visible: boolean) => {
    setClicked(visible);
    setStartEdit(false);
    setHovered(false);
  };

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
      (await wallet.getAddedToken(currentAccount?.address)) || [];
    const newAddTokenSymbolList = localAdded.filter((item) => item !== uuid);
    await wallet.updateAddedToken(
      currentAccount?.address,
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
      (await wallet.getAddedToken(currentAccount?.address)) || [];
    setAddedToken(newAddTokenList);
    await wallet.updateAddedToken(currentAccount?.address, [
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
              <div className="h-[36px] flex header-wrapper items-center relative">
                <Popover
                  content={clickContent}
                  trigger="click"
                  visible={clicked}
                  placement="bottomLeft"
                  overlayClassName="switch-popover"
                  onVisibleChange={handleClickChange}
                >
                  {
                    <img
                      className={clsx(
                        'icon icon-account-type w-[20px] h-[20px]',
                        opacity60 && 'opacity-60'
                      )}
                      src={
                        WALLET_BRAND_CONTENT[currentAccount.brandName]?.image ||
                        KEYRING_ICONS_WHITE[currentAccount.type]
                      }
                    />
                  }
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
                  <img
                    className="icon icon-account-type w-[16px] h-[16px] ml-8"
                    src={IconUpAndDown}
                  />
                </Popover>
              </div>
              <img
                src={IconInfo}
                onClick={() => {
                  setHovered(true);
                  ReactGA.event({
                    category: 'AccountInfo',
                    action: 'getQRCode',
                    label: [
                      getKRCategoryByType(currentAccount?.type),
                      currentAccount?.brandName,
                    ].join('|'),
                  });
                }}
                className="w-[18px] h-[18px] mr-12 pointer"
              />
              <Copy
                onClick={() => {
                  ReactGA.event({
                    category: 'AccountInfo',
                    action: 'headCopyAddress',
                    label: [
                      getKRCategoryByType(currentAccount?.type),
                      currentAccount?.brandName,
                    ].join('|'),
                  });
                }}
                variant="address"
                data={currentAccount.address}
                className="w-18"
                icon={IconCopy}
              ></Copy>
            </div>
          )}
          <BalanceView
            currentAccount={currentAccount}
            showChain={showChain}
            startAnimate={startAnimate}
            onClick={() => {
              if (!showToken && !showAssets && !showNFT) {
                ReactGA.event({
                  category: 'ViewAssets',
                  action: 'openTotal',
                  label: [
                    getKRCategoryByType(currentAccount?.type),
                    currentAccount?.brandName,
                  ].join('|'),
                });
                displayTokenList();
              } else {
                ReactGA.event({
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
          <div className={clsx('listContainer', showChain && 'mt-10')}>
            <div
              className={clsx('token', showToken && 'showToken')}
              onClick={() => {
                ReactGA.event({
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
                ReactGA.event({
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
                ReactGA.event({
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
                    ReactGA.event({
                      category: 'ViewAssets',
                      action: 'switchNFTFilter',
                      label: [
                        getKRCategoryByType(currentAccount?.type),
                        currentAccount?.brandName,
                        nftType === 'collection' ? 'collections' : 'all',
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
          showModal={showChainsModal}
          pendingTxCount={pendingTxCount}
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
          {isGnosis && (
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
          )}
        </div>
      </Modal>
      {!(showToken || showAssets || showNFT) && <DefaultWalletSetting />}
    </>
  );
};

export default connectStore()(Dashboard);
