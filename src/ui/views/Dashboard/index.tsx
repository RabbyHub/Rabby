import React, { useEffect, useState, useRef } from 'react';
import ClipboardJS from 'clipboard';
import QRCode from 'qrcode.react';
import cloneDeep from 'lodash/cloneDeep';
import BigNumber from 'bignumber.js';
import { useHistory, useLocation, Link } from 'react-router-dom';
import { useInterval } from 'react-use';
import { message, Popover, Input } from 'antd';
import { FixedSizeList } from 'react-window';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Safe from '@rabby-wallet/gnosis-sdk';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/dist/api';
import {
  KEYRING_ICONS,
  WALLET_BRAND_CONTENT,
  KEYRING_ICONS_WHITE,
  KEYRING_CLASS,
  KEYRING_TYPE,
  CHAINS,
} from 'consts';
import {
  useWallet,
  isSameAddress,
  splitNumberByStep,
  useHover,
} from 'ui/utils';
import { AddressViewer, Modal } from 'ui/component';
import { crossCompareOwners } from 'ui/utils/gnosis';
import { Account } from 'background/service/preference';
import { ConnectedSite } from 'background/service/permission';
import { TokenItem, AssetItem } from 'background/service/openapi';

import {
  ChainAndSiteSelector,
  BalanceView,
  DefaultWalletAlertBar,
  TokenList,
  AssetsList,
  GnosisWrongChainAlertBar,
  NFTListContainer,
} from './components';
import { getUpdateContent } from 'changeLogs/index';
import IconSuccess from 'ui/assets/success.svg';
import IconUpAndDown from 'ui/assets/up-and-down.svg';
import { ReactComponent as IconCopy } from 'ui/assets/urlcopy.svg';
import IconEditPen from 'ui/assets/editpen.svg';
import IconCorrect from 'ui/assets/correct.svg';
import IconPlus from 'ui/assets/dashboard-plus.svg';
import IconInfo from 'ui/assets/information.png';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconAddToken from 'ui/assets/addtoken.png';
import IconAddressCopy from 'ui/assets/address-copy.png';
import { SvgIconLoading } from 'ui/assets';

import './style.less';
import Dropdown from './components/NFT/Dropdown';

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
      <AddressViewer address={address} showArrow={false} />
      {addressInWallet ? (
        <img src={IconTagYou} className="icon icon-tag" />
      ) : (
        <></>
      )}
      <div className="address-type">
        {addressInWallet ? (
          <img
            className="icon icon-account-type"
            src={
              KEYRING_ICONS[addressInWallet.type] ||
              WALLET_BRAND_CONTENT[addressInWallet.brandName].image
            }
          />
        ) : (
          <></>
        )}
      </div>
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
  const wallet = useWallet();
  const { t } = useTranslation();
  const fixedList = useRef<FixedSizeList>();

  const nftRef = useRef<any>();

  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [pendingTxCount, setPendingTxCount] = useState(0);
  const [gnosisPendingCount, setGnosisPendingCount] = useState(0);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [isDefaultWallet, setIsDefaultWallet] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [startEdit, setStartEdit] = useState(false);
  const [alianName, setAlianName] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [firstNotice, setFirstNotice] = useState(false);
  const [updateContent, setUpdateContent] = useState('');
  const [showChain, setShowChain] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showNFT, setShowNFT] = useState(false);
  const [allTokens, setAllTokens] = useState<TokenItem[]>([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [searchTokens, setSearchTokens] = useState<TokenItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [nfts, setNFTs] = useState<number[]>([]);
  const [startSearch, setStartSearch] = useState(false);
  const [addedToken, setAddedToken] = useState<string[]>([]);
  const [defiAnimate, setDefiAnimate] = useState('fadeOut');
  const [nftAnimate, setNFTAnimate] = useState('fadeOut');
  const [tokenAnimate, setTokenAnimate] = useState('fadeOut');
  const [topAnimate, setTopAnimate] = useState('');
  const [connectionAnimation, setConnectionAnimation] = useState('');
  const [nftType, setNFTType] = useState<'collection' | 'nft'>('collection');

  const [startAnimate, setStartAnimate] = useState(false);
  const [isGnosis, setIsGnosis] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [gnosisNetworkId, setGnosisNetworkId] = useState('1');
  const [showGnosisWrongChainAlert, setShowGnosisWrongChainAlert] = useState(
    false
  );
  const [currentConnection, setCurrentConnection] = useState<
    ConnectedSite | null | undefined
  >(null);
  const getCurrentAccount = async () => {
    const account = await wallet.getCurrentAccount();
    if (!account) {
      history.replace('/no-address');
      return;
    }
    setCurrentAccount(account);
  };

  const getPendingTxCount = async (address: string) => {
    const count = await wallet.getPendingCount(address);
    setPendingTxCount(count);
  };

  const checkIsDefaultWallet = async () => {
    const isDefault = await wallet.isDefaultWallet();
    setIsDefaultWallet(isDefault);
  };

  const getAlianName = async (address: string) => {
    await wallet.getAlianName(address).then((name) => {
      setAlianName(name);
      setDisplayName(name);
    });
  };

  const getGnosisPendingCount = async () => {
    if (!currentAccount) return;

    const network = await wallet.getGnosisNetworkId(currentAccount.address);
    setGnosisNetworkId(network);
    const [info, txs] = await Promise.all([
      Safe.getSafeInfo(currentAccount.address, network),
      Safe.getPendingTransactions(currentAccount.address, network),
    ]);
    const owners = await wallet.getGnosisOwners(
      currentAccount,
      currentAccount.address,
      info.version
    );
    const comparedOwners = crossCompareOwners(owners, info.owners);
    setSafeInfo({
      ...info,
      owners: comparedOwners,
    });
    setGnosisPendingCount(txs.results.length);
  };

  useInterval(() => {
    if (!currentAccount) return;
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) return;
    getPendingTxCount(currentAccount.address);
  }, 30000);

  useEffect(() => {
    if (!currentAccount) {
      getCurrentAccount();
    }
    checkIsDefaultWallet();
  }, []);

  useEffect(() => {
    if (currentAccount) {
      if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
        setSafeInfo(null);
        getGnosisPendingCount();
      } else {
        getPendingTxCount(currentAccount.address);
      }
      getAlianName(currentAccount?.address.toLowerCase());
      setCurrentAccount(currentAccount);
    }
  }, [currentAccount]);
  useEffect(() => {
    getAllKeyrings();
  }, []);

  const handleChange = async (account) => {
    setIsListLoading(true);
    setIsAssetsLoading(true);
    const { address, type, brandName } = account;
    await wallet.changeAccount({ address, type, brandName });
    setCurrentAccount({ address, type, brandName });
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
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('Copied'),
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };

  const handleDefaultWalletChange = async () => {
    const isDefault = await wallet.isDefaultWallet();
    setIsDefaultWallet(isDefault);
  };

  const handleAlianNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setAlianName(e.target.value);
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
      setAccountsList(newAccountList);
    }
  };

  const checkIfFirstLogin = async () => {
    const firstOpen = await wallet.getIsFirstOpen();
    const updateContent = await getUpdateContent();
    setUpdateContent(updateContent);
    if (!firstOpen || !updateContent) return;
    setFirstNotice(firstOpen);
  };

  const changeIsFirstLogin = () => {
    wallet.updateIsFirstOpen();
    setFirstNotice(false);
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
      return new BigNumber(b.asset_usd_value)
        .minus(new BigNumber(a.asset_usd_value))
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
      if (tokens.length > 0) {
        setSearchTokens(tokens.filter((item) => !item.is_core));
      }
    } else {
      setIsListLoading(true);
      const defaultTokens = await wallet.openapi.listToken(
        currentAccount?.address
      );
      setAllTokens(defaultTokens);
      const localAdded =
        (await wallet.getAddedToken(currentAccount?.address)) || [];
      const localAddedTokens = await wallet.openapi.customListToken(
        localAdded,
        currentAccount?.address
      );
      const addedToken = localAdded.map((item) => {
        if (item.includes(':')) {
          return item.split(':')[1];
        }
      });
      setAddedToken(addedToken);
      tokens = sortTokensByPrice([...defaultTokens, ...localAddedTokens]);
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
    checkIfFirstLogin();
  }, []);
  useEffect(() => {
    if (currentAccount) {
      setTokens([]);
      setAssets([]);
      setNFTs([]);
    }
  }, [currentAccount]);
  useEffect(() => {
    if (currentAccount) {
      setIsGnosis(currentAccount.type === KEYRING_CLASS.GNOSIS);
    }
  }, [currentAccount]);
  const Row = (props) => {
    const { data, index, style } = props;
    const account = data[index];
    const [isHovering, hoverProps] = useHover();
    return (
      <div
        className="flex items-center address-item"
        key={index}
        style={style}
        onClick={(e) => {
          const target = e.target as Element;
          if (target?.id !== 'copyIcon') {
            handleChange(account);
          }
        }}
        {...hoverProps}
      >
        {' '}
        <img
          className="icon icon-account-type w-[20px] h-[20px]"
          src={
            KEYRING_ICONS[account.type] ||
            WALLET_BRAND_CONTENT[account.brandName]?.image
          }
        />
        <div className="flex flex-col items-start ml-10">
          <div className="text-13 text-black text-left click-name">
            <div className="list-alian-name">{account?.alianName}</div>
            <div className="flex items-center">
              <AddressViewer
                address={account?.address}
                showArrow={false}
                className={'address-color'}
              />
              {isHovering && (
                <img
                  onClick={(e) => {
                    e.stopPropagation;
                    navigator.clipboard.writeText(account?.address);
                    message.success({
                      icon: (
                        <img src={IconSuccess} className="icon icon-success" />
                      ),
                      content: t('Copied'),
                      duration: 0.5,
                    });
                  }}
                  src={IconAddressCopy}
                  id={'copyIcon'}
                  className={clsx('ml-7  w-[16px] h-[16px]', {
                    success: copySuccess,
                  })}
                />
              )}
              <div className={'money-color'}>
                ${splitNumberByStep(Math.floor(account?.balance))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const clickContent = () => (
    <div className="click-list flex flex-col w-[233px]">
      {loadingAddress ? (
        <div className="address-loading">
          <SvgIconLoading className="icon icon-loading" fill="#707280" />
          <div className="text-14 text-gray-light">
            {t('Loading Addresses')}
          </div>
        </div>
      ) : accountsList.length <= 0 ? (
        <div className="no-other-address"> {t('No address')}</div>
      ) : (
        <FixedSizeList
          height={accountsList.length > 5 ? 308 : accountsList.length * 52}
          width="100%"
          itemData={accountsList}
          itemCount={accountsList.length}
          itemSize={54}
          ref={fixedList}
          style={{ zIndex: 10 }}
        >
          {Row}
        </FixedSizeList>
      )}
      <Link to="/add-address" className="pop-add-address flex items-center">
        {' '}
        <img src={IconPlus} />
        <p className="mb-0 ml-15 lh-1">{t('Add addresses')}</p>
      </Link>
    </div>
  );
  const balanceList = async (accounts) => {
    return await Promise.all<Account>(
      accounts.map(async (item) => {
        let balance = await wallet.getAddressCacheBalance(item?.address);
        if (!balance) {
          balance = await wallet.getAddressBalance(item?.address);
        }
        return {
          ...item,
          balance: balance?.total_usd_value || 0,
        };
      })
    );
  };
  const getAllKeyrings = async () => {
    setLoadingAddress(true);
    const _accounts = await wallet.getAllVisibleAccounts();
    const allAlianNames = await wallet.getAllAlianName();
    const templist = await _accounts
      .map((item) =>
        item.accounts.map((account) => {
          return {
            ...account,
            type: item.type,
            alianName: allAlianNames[account?.address?.toLowerCase()],
            keyring: item.keyring,
          };
        })
      )
      .flat(1);
    const result = await balanceList(templist);
    setLoadingAddress(false);
    if (result) {
      const withBalanceList = result.sort((a, b) => {
        return new BigNumber(b?.balance || 0)
          .minus(new BigNumber(a?.balance || 0))
          .toNumber();
      });
      setAccountsList(withBalanceList);
    }
  };

  const handleClickChange = (visible) => {
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
    setShowAssets(false);
    setShowNFT(false);
  };
  const balanceViewClick = () => {
    if (!showToken && !showAssets && !showNFT) {
      displayTokenList();
    } else {
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
    if (nfts.length === 0 && nftRef.current.fetchData) {
      nftRef.current?.fetchData(currentAccount?.address)?.then(() => {
        setNFTs([1]);
      });
    }
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

  const handleCurrentConnectChange = (
    connection: ConnectedSite | null | undefined
  ) => {
    setCurrentConnection(connection);
  };

  const checkGnosisConnectChain = () => {
    if (!currentConnection) {
      setShowGnosisWrongChainAlert(false);
      return;
    }
    const chain = CHAINS[currentConnection.chain];
    setShowGnosisWrongChainAlert(chain.id.toString() !== gnosisNetworkId);
  };

  useEffect(() => {
    checkGnosisConnectChain();
  }, [currentConnection, gnosisNetworkId]);
  useEffect(() => {
    if (!showNFT) {
      setNFTType('collection');
    }
  }, [showNFT]);
  const opacity60 =
    currentAccount?.type === KEYRING_CLASS.MNEMONIC ||
    currentAccount?.type === KEYRING_CLASS.PRIVATE_KEY ||
    currentAccount?.type === KEYRING_CLASS.WATCH;
  return (
    <>
      <div
        className={clsx('dashboard', {
          'metamask-active':
            !isDefaultWallet || (showGnosisWrongChainAlert && isGnosis),
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
                        KEYRING_ICONS_WHITE[currentAccount.type] ||
                        WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
                      }
                    />
                  }
                  <div className="text-15 text-white ml-6 mr-6 dashboard-name">
                    {displayName}
                  </div>
                  {currentAccount && (
                    <AddressViewer
                      address={currentAccount.address}
                      showArrow={false}
                      className={'text-12 text-white opacity-60'}
                    />
                  )}
                  <img
                    className="icon icon-account-type w-[16px] h-[16px] ml-8"
                    src={IconUpAndDown}
                  />
                </Popover>
              </div>
              <img
                src={IconInfo}
                onClick={() => setHovered(true)}
                className="w-[16px] h-[16px] pointer"
              />
            </div>
          )}
          <BalanceView
            currentAccount={currentAccount}
            showChain={showChain}
            startAnimate={startAnimate}
            onClick={balanceViewClick}
          />
          <div className={clsx('listContainer', showChain && 'mt-10')}>
            <div
              className={clsx('token', showToken && 'showToken')}
              onClick={displayTokenList}
            >
              Token
            </div>
            <div
              className={clsx('token', showAssets && 'showToken')}
              onClick={displayAssets}
            >
              DeFi
            </div>
            <div
              className={clsx('token', showNFT && 'showToken')}
              onClick={displayNFTs}
            >
              NFT
            </div>
            {showToken && !startSearch && (
              <img
                src={IconAddToken}
                onClick={() => setStartSearch(true)}
                className="w-[18px] h-[18px] pointer absolute right-0"
              />
            )}
            {showNFT && (
              <div className="pointer absolute right-0">
                <Dropdown value={nftType} onChange={setNFTType} />
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
            ref={nftRef}
            type={nftType}
          ></NFTListContainer>
        </div>
        <ChainAndSiteSelector
          onChange={handleCurrentConnectChange}
          connectionAnimation={connectionAnimation}
          showDrawer={showToken || showAssets || showNFT}
          hideAllList={hideAllList}
          showModal={showChainsModal}
          isGnosis={isGnosis}
        />
        {!isDefaultWallet && !showChain && (
          <DefaultWalletAlertBar onChange={handleDefaultWalletChange} />
        )}
        {isDefaultWallet &&
          isGnosis &&
          showGnosisWrongChainAlert &&
          !showChain && <GnosisWrongChainAlertBar />}
      </div>
      <Modal
        visible={firstNotice && updateContent}
        title="What's new"
        className="first-notice"
        onCancel={changeIsFirstLogin}
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
        width="344px"
      >
        <div className="flex flex-col" onClick={() => setStartEdit(false)}>
          <div className="address-popover__info">
            <div className="flex items-center h-[32px]">
              {currentAccount && (
                <img
                  className="icon icon-account-type w-[32px] h-[32px]"
                  src={
                    KEYRING_ICONS[currentAccount.type] ||
                    WALLET_BRAND_CONTENT[currentAccount.brandName]?.image
                  }
                />
              )}
              <div className="brand-name">
                {startEdit ? (
                  <Input
                    value={alianName}
                    defaultValue={alianName}
                    onChange={handleAlianNameChange}
                    onPressEnter={alianNameConfirm}
                    autoFocus={startEdit}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={20}
                    min={0}
                    style={{ zIndex: 10 }}
                  />
                ) : (
                  displayName
                )}
              </div>
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
              {startEdit && (
                <img
                  className="edit-name w-[16px] h-[16px]"
                  src={IconCorrect}
                  onClick={(e) => {
                    e.stopPropagation();
                    alianNameConfirm(e);
                  }}
                />
              )}
            </div>
            <div className="flex text-12 mt-12">
              <div className="mr-8 pt-2 lh-14">{currentAccount?.address}</div>
              <IconCopy
                onClick={handleCopyCurrentAddress}
                className={clsx('icon icon-copy ml-7 mb-2 copy-icon', {
                  success: copySuccess,
                })}
              />
            </div>
            <div className="qrcode-container">
              <QRCode value={currentAccount?.address} size={85} />
            </div>
          </div>
          {isGnosis && (
            <div className="address-popover__gnosis">
              <h4 className="text-15 mb-4">Admins</h4>
              {safeInfo ? (
                <>
                  <p className="text-black text-12 mb-20">
                    Any transaction requires the confirmation of{' '}
                    <span className="ml-8 font-medium threshold">
                      {safeInfo.threshold}/{safeInfo.owners.length}
                    </span>
                  </p>
                  <ul className="admin-list">
                    {safeInfo.owners.map((owner, index) => (
                      <GnosisAdminItem
                        address={owner}
                        accounts={accountsList}
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
    </>
  );
};

export default Dashboard;
