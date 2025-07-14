import { Input, message, Popover } from 'antd';
import ClipboardJS from 'clipboard';
import clsx from 'clsx';
import { Trans, useTranslation } from 'react-i18next';
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
  NETWORK_TYPE_LIST,
  CHAINS_ENUM,
} from 'consts';
import QRCode from 'qrcode.react';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useInterval } from 'react-use';
import IconAddressCopy from 'ui/assets/address-copy.png';
import IconCorrect from 'ui/assets/dashboard/contacts/correct.png';
import IconUnCorrect from 'ui/assets/dashboard/contacts/uncorrect.png';
import IconEditPen from 'ui/assets/editpen.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy.svg';

import IconSuccess from 'ui/assets/success.svg';
import { AddressViewer, Modal } from 'ui/component';
import {
  connectStore,
  useRabbyDispatch,
  useRabbyGetter,
  useRabbySelector,
} from 'ui/store';
import { useWallet } from 'ui/utils';
import {
  BalanceView,
  ChainAndSiteSelector,
  GnosisWrongChainAlertBar,
} from './components';
import './style.less';

import PendingApproval from './components/PendingApproval';
import PendingTxs from './components/PendingTxs';
import { getKRCategoryByType } from '@/utils/transaction';

import { ReactComponent as IconArrowRight } from 'ui/assets/dashboard/arrow-right.svg';
import Queue from './components/Queue';
import { copyAddress } from '@/ui/utils/clipboard';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { CommonSignal } from '@/ui/component/ConnectStatus/CommonSignal';
import { useHomeBalanceViewOuterPrefetch } from './components/BalanceView/useHomeBalanceView';
import { GasAccountDashBoardHeader } from '../GasAccount/components/DashBoardHeader';
import { useGnosisPendingCount } from '@/ui/hooks/useGnosisPendingCount';
import { ga4 } from '@/utils/ga4';
import {
  Avatar,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Heading,
  Inset,
  Section,
  SegmentedControl,
  Spinner,
  Strong,
  TabNav,
  Text,
  Theme,
} from '@radix-ui/themes';
import { PageBody, PageContainer } from 'ui/component/PageContainer';
import { CopyIcon, LucideInfo, LucidePlus } from 'lucide-react';
import ProfileDropdown from '@/ui/component/ProfileDropdown';
import { E_NetworkType } from '@/types/enum';
import {
  defaultTestnetChains,
  getChainList,
  getMainnetChainList,
  getTestnetChainList,
  supportedChainToTestnetChain,
} from '@/utils/chain';
import chainList from 'consts/chainList.json';
import { Chain } from '@debank/common';
import { capitalize } from 'lodash';
import CopyTextComponent from '@/ui/component/CopyToClipboard';
import CustomSuspense from '@/ui/component/CustomSuspense';
import { ellipsisAddress } from 'ui/utils/address';
import { UINetworkSelection } from 'ui/component/UINetworkSelection';
import ChainAndSiteSelectorV2 from './components/ChainAndSiteSelector/index_new';

const Dashboard = () => {
  const history = useHistory();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const { alianName, currentAccount, accountsList } = useRabbySelector((s) => ({
    alianName: s.account.alianName,
    currentAccount: s.account.currentAccount,
    accountsList: s.accountToDisplay.accountsList,
  }));

  const { pendingTransactionCount: pendingTxCount } = useRabbySelector((s) => ({
    ...s.transactions,
  }));

  const { firstNotice, updateContent, version } = useRabbySelector((s) => ({
    ...s.appVersion,
  }));
  const {
    mainnetList,
    testnetList,
    currentConnection,
    networkCurrentConnection,
    networkType,
    testnetChain,
  } = useRabbySelector((s) => ({
    currentConnection: s.chains.currentConnection,
    testnetCurrentConnection: s.chains.testnetCurrentConnection,
    mainnetCurrentConnection: s.chains.mainnetCurrentConnection,
    networkCurrentConnection:
      s.chains.networkType === E_NetworkType.mainnet
        ? s.chains.mainnetCurrentConnection
        : s.chains.testnetCurrentConnection,
    gnosisNetworkIds: s.chains.gnosisNetworkIds,
    mainnetList: s.chains.mainnetList,
    testnetList: s.chains.testnetList,
    networkType: s.chains.networkType,
    testnetChain: s.preference.testnetChain,
  }));

  const [copySuccess, setCopySuccess] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [startEdit, setStartEdit] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [showChain, setShowChain] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [showNFT, setShowNFT] = useState(false);
  const [topAnimate, setTopAnimate] = useState('');
  const [connectionAnimation, setConnectionAnimation] = useState('');
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(null);

  const isGnosis = useRabbyGetter((s) => s.chains.isCurrentAccountGnosis);
  const gnosisPendingCount = useRabbySelector(
    (s) => s.chains.gnosisPendingCount
  );

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

  useGnosisPendingCount(
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
      onSuccess(total) {
        dispatch.chains.setField({
          gnosisPendingCount: total || 0,
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
      const pendingCount = await wallet.getPendingApprovalCount();
      setPendingApprovalCount(pendingCount);
    })();
  }, []);

  useEffect(() => {
    if (clicked) {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    }
  }, [clicked]);

  const handleCopyCurrentAddress = () => {
    const { t } = useTranslation();
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
              {t('global.copied')}
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
  const gotoGasAccount = () => {
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Gas Account',
    });

    ga4.fireEvent('Click_GasAccount', {
      event_category: 'Front Page Click',
    });

    history.push('/gas-account');
  };
  const { dashboardBalanceCacheInited } = useHomeBalanceViewOuterPrefetch(
    currentAccount?.address
  );

  useEffect(() => {
    dispatch.appVersion.checkIfFirstLoginAsync();
  }, [dispatch]);

  const hideAllList = () => {
    setShowAssets(false);
    setShowChain(false);
    setShowToken(false);
    setShowNFT(false);
    setConnectionAnimation('fadeInBottom');
    setTopAnimate('fadeInTop');
  };

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

    ga4.fireEvent('Click_ChangeAddress', {
      event_category: 'Front Page Click',
    });

    history.push('/switch-address');
  };

  const brandIcon = useWalletConnectIcon(currentAccount);
  const { t } = useTranslation();

  const allChainList = getChainList();
  const testnetChainList = defaultTestnetChains;
  // const mainnetChainList = getMainnetChainList();

  // Transform chain lists into the format expected by UINetworkSelection
  const networkList = useMemo(() => {
    const list = [];

    // Add mainnet networks
    mainnetList.forEach((chain) => {
      list.push({
        network: 'mainnet',
        value: chain.id.toString(),
        name: chain.name,
        symbol: chain.nativeTokenSymbol,
      });
    });

    // Add testnet networks
    testnetChainList.forEach((chain) => {
      list.push({
        network: 'testnet',
        value: chain.id.toString(),
        name: chain.name,
        symbol: chain.nativeTokenSymbol,
      });
    });

    return list;
  }, [mainnetList, testnetChainList]);

  // Set initial selected network
  useEffect(() => {
    if (networkList.length > 0 && !selectedNetwork) {
      const networksForCurrentType = networkList.filter(
        (n) => n.network === networkType
      );
      if (networksForCurrentType.length > 0) {
        const chainId = networksForCurrentType[0].value;
        const chain = allChainList.find((c) => c.id.toString() === chainId);
        if (chain) {
          setSelectedNetwork(chain);
        }
      }
    }
  }, [networkList, networkType, allChainList, selectedNetwork]);

  // Handle network change
  const handleNetworkChange = useCallback(
    (chainId: string) => {
      const chain = allChainList.find((c) => c.id.toString() === chainId);
      if (chain) {
        // Only update if the selected network has changed
        if (!selectedNetwork || selectedNetwork.id !== chain.id) {
          setSelectedNetwork(chain);
          // Update the current connection if needed
          if (currentConnection) {
            const updatedConnection = {
              ...currentConnection,
              chain: chain.enum,
            };
            dispatch.chains.setField({
              currentConnection: updatedConnection,
            });
          }
        }
      }
    },
    [allChainList, currentConnection, dispatch.chains, selectedNetwork]
  );

  // const handleChangeDefaultChain = async (chain: CHAINS_ENUM) => {
  //   const _site = {
  //     ...site!,
  //     chain,
  //   };
  //   setSite(_site);
  //   setVisible(false);
  //   onChainChange?.(chain);
  //   await wallet.setSite(_site);
  //   const rpc = await wallet.getCustomRpcByChain(chain);
  //   if (rpc) {
  //     const avaliable = await wallet.pingCustomRPC(chain);
  //     if (!avaliable) {
  //       message.error(t('page.dashboard.recentConnection.rpcUnavailable'));
  //     }
  //   }
  // };

  return (
    <PageContainer>
      <PageBody>
        <Flex
          wrap={'wrap'}
          align={'start'}
          direction={'column'}
          gap={'3'}
          py={'3'}
          overflow={'auto'}
        >
          <Flex align={'center'} justify={'between'} width={'100%'}>
            {/* <QRCode /> */}
            {/*<Button asChild variant={'soft'}>
              <Button onClick={() => history.push('/networks')}>
                <LucidePlus size={16} strokeWidth={3} />
                <Text>Add Network</Text>
              </Button>
            </Button>*/}
            <Flex direction={'row'} justify={'between'} p={'1'} width={'100%'}>
              <SegmentedControl.Root
                defaultValue={networkType}
                size="2"
                onValueChange={(value) => {
                  dispatch.chains.setField({
                    networkType: value as E_NetworkType,
                  });
                }}
              >
                {NETWORK_TYPE_LIST.map((eachNetworkType) => (
                  <SegmentedControl.Item
                    key={eachNetworkType.toLowerCase()}
                    value={eachNetworkType.toLowerCase()}
                  >
                    {capitalize(eachNetworkType)}
                  </SegmentedControl.Item>
                ))}
              </SegmentedControl.Root>
              {/*<UINetworkSelection
                currentNetwork={selectedNetwork}
                networkType={networkType}
                list={networkList}
                onNetworkChange={handleNetworkChange}
              />*/}
            </Flex>
            {/* <SignedOut>
                <SignInButton />
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn> */}
            <Flex align={'center'} gap={'3'}>
              <ProfileDropdown />
            </Flex>
          </Flex>
          <Flex direction={'column'} width={'100%'} maxWidth={'100%'}>
            <Callout.Root
              size={'1'}
              color={networkType === E_NetworkType.mainnet ? 'amber' : 'green'}
            >
              <Callout.Icon>
                <LucideInfo size={16} />
              </Callout.Icon>
              {/* @ts-expect-error "This is a negligible error" */}
              <Callout.Text>
                <>
                  You are on ({networkCurrentConnection?.chain}){' '}
                  <Strong>{networkType}</Strong> - {testnetChain}
                </>
              </Callout.Text>
            </Callout.Root>
          </Flex>

          <ChainAndSiteSelectorV2
            onChange={(currentConnection) => {
              dispatch.chains.setField({ currentConnection });

              if (networkType === E_NetworkType.mainnet) {
                dispatch.chains.setField({
                  mainnetCurrentConnection: currentConnection,
                });
              } else {
                dispatch.chains.setField({
                  testnetCurrentConnection: currentConnection,
                });
                currentConnection?.chain &&
                  dispatch.chains.setTestnetChain(currentConnection?.chain);
              }
            }}
            connectionAnimation={connectionAnimation}
            showDrawer={showToken || showAssets || showNFT}
            hideAllList={hideAllList}
            gnosisPendingCount={gnosisPendingCount}
            isGnosis={isGnosis}
            higherBottom={isGnosis}
            setDashboardReload={() => setDashboardReload(true)}
          />

          <Section size={'1'} width={'100%'} maxWidth={'100%'}>
            <Flex direction={'column'}>
              <Text as={'div'} wrap={'wrap'} align={'center'}>
                <Text align={'left'} size={'2'} weight={'bold'}>
                  {displayName || 'Account'}
                </Text>
                <Box className="">
                  <CopyTextComponent
                    textToCopy={currentAccount?.address as string}
                  >
                    <Button variant="soft" radius="full">
                      <Flex
                        position={'relative'}
                        direction={'row'}
                        justify={'center'}
                        align={'center'}
                        gap={'2'}
                        py={'1'}
                      >
                        <Text as="div" size={'2'} weight={'bold'}>
                          {currentAccount &&
                            // networkType === E_NetworkType.mainnet &&
                            // currentAccount?.ensName) ||
                            ellipsisAddress(currentAccount?.address as string)}
                        </Text>
                        <CopyIcon size={16} />
                      </Flex>
                    </Button>
                  </CopyTextComponent>
                </Box>
              </Text>
              <Section size={'2'}>
                <Flex direction={'column'} align={'center'} gap={'8'}>
                  <Heading size={'9'} align={'center'}>
                    {/*{toDecimalPlace(Number(currentAccount?.balance), 4)}{' '}*/}
                    <Text size={'8'} color={'gray'}>
                      {currentConnection?.chain.toLocaleUpperCase()}
                    </Text>
                    {/* Display the Dollar equivalent here in amber color */}
                    <Text
                      as={'div'}
                      weight={'regular'}
                      size={'4'}
                      align={'center'}
                      color={'gray'}
                      style={{ opacity: '0.8' }}
                    >
                      ≈{' '}
                      <Text size={'5'} color={'gray'}>
                        $
                      </Text>
                      {/* {toDecimalPlace(Number(ethPrice * Number(account?.balance ?? 0)), 4)} */}
                      {/* {toDecimalPlace(
                        Number(ethPrice * Number(currentBalance)),
                        4
                      )}*/}
                      {dashboardBalanceCacheInited && (
                        <BalanceView currentAccount={currentAccount} />
                      )}
                    </Text>
                  </Heading>

                  {/*<Button variant="classic" onClick={handleGetBalance}>
                    Refresh Balance
                  </Button>*/}
                </Flex>
              </Section>
            </Flex>
          </Section>
        </Flex>

        <div
          className={clsx('dashboard', {
            'metamask-active': showGnosisWrongChainAlert && isGnosis,
          })}
        >
          <div className={clsx('main', showChain && 'show-chain-bg')}>
            {currentAccount && (
              <div
                className={clsx(
                  'flex header items-center relative',
                  topAnimate
                )}
              >
                <div
                  className="h-[36px] flex header-wrapper items-center relative mr-0"
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
                          WALLET_BRAND_CONTENT[currentAccount.brandName]
                            ?.image ||
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
                    <IconArrowRight className="ml-6" />
                  </Popover>
                </div>

                <RcIconCopy
                  viewBox="0 0 18 18"
                  className="copyAddr actionIcon w-16 h-16 ml-8 mr-16"
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

                    ga4.fireEvent('Click_CopyAddress', {
                      event_category: 'Front Page Click',
                    });
                  }}
                />

                <div
                  className="ml-auto cursor-pointer"
                  onClick={gotoGasAccount}
                >
                  <GasAccountDashBoardHeader />
                </div>
              </div>
            )}
            {dashboardBalanceCacheInited && (
              <BalanceView currentAccount={currentAccount} />
            )}
            {isGnosis ? (
              <Queue
                count={gnosisPendingCount || 0}
                className={clsx(
                  'transition-all',
                  showChain ? 'opacity-0 pointer-events-none' : 'opacity-100'
                )}
              />
            ) : (
              pendingTxCount > 0 &&
              !showChain && <PendingTxs pendingTxCount={pendingTxCount} />
            )}
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
          title={t('page.dashboard.home.whatsNew')}
          className="first-notice"
          onCancel={() => {
            dispatch.appVersion.afterFirstLogin();
          }}
          maxHeight="420px"
        >
          <div>
            <p className="mb-12">{version}</p>
            <ReactMarkdown
              children={updateContent}
              remarkPlugins={[remarkGfm]}
            />
          </div>
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
                        i18nKey="page.dashboard.home.importType"
                        values={{
                          type:
                            WALLET_BRAND_CONTENT[currentAccount?.brandName]
                              ?.name,
                        }}
                      />
                    ))}
                </div>
              </div>
              <div className="qrcode-container">
                <QRCode value={currentAccount?.address || ''} size={100} />
              </div>
            </div>
          </div>
        </Modal>
        {pendingApprovalCount > 0 && (
          <PendingApproval
            onRejectAll={() => {
              setPendingApprovalCount(0);
            }}
            count={pendingApprovalCount}
          />
        )}
      </PageBody>

      <Card size="1">
        <Theme panelBackground="translucent">
          <Inset clip="border-box" side="all" pb="current">
            <Flex
              direction={'column'}
              align={'center'}
              py={'1'}
              width={'100%'}
              style={{ background: 'var(--color-' }}
            >
              <TabNav.Root
                highContrast
                wrap={'wrap'}
                justify={'center'}
                style={{
                  width: '100%',
                }}
              >
                <TabNav.Link
                  active={location.pathname === '/'}
                  style={{
                    padding: '0px 0px',
                    width: '100%',
                    display: 'flex',
                    flexGrow: '1',
                    flexBasis: '100%',
                  }}
                >
                  <Button
                    className={'w-full'}
                    variant="ghost"
                    onClick={() => history.push('/home')}
                  >
                    Home
                  </Button>
                </TabNav.Link>
                <TabNav.Link
                  active={location.pathname === '/wallets'}
                  style={{
                    padding: '0px 0px',
                    width: '100%',
                    display: 'flex',
                    flexGrow: '1',
                    flexBasis: '100%',
                  }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => history.push('/accounts')}
                  >
                    Accounts
                  </Button>
                </TabNav.Link>
                <TabNav.Link
                  active={location.pathname === 'history'}
                  style={{
                    padding: '0px 0px',
                    width: '100%',
                    display: 'flex',
                    flexGrow: '1',
                    flexBasis: '100%',
                  }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => history.push('/history')}
                  >
                    Transactions
                  </Button>
                </TabNav.Link>
                <TabNav.Link
                  active={
                    location.pathname === '/faucet' ||
                    location.pathname === '/defi'
                  }
                  style={{
                    padding: '0px 0px',
                    width: '100%',
                    display: 'flex',
                    flexGrow: '1',
                    flexBasis: '100%',
                  }}
                >
                  {networkType === 'testnet' ? (
                    <Button
                      variant="ghost"
                      onClick={() => history.push('/faucet')}
                    >
                      Faucet
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => history.push('/defi')}
                    >
                      DeFi
                    </Button>
                  )}
                </TabNav.Link>
                <TabNav.Link
                  active={location.pathname === 'settings'}
                  style={{
                    padding: '0px 0px',
                    width: '100%',
                    display: 'flex',
                    flexGrow: '1',
                    flexBasis: '100%',
                  }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => history.push('/settings')}
                  >
                    Settings
                  </Button>
                </TabNav.Link>
              </TabNav.Root>
            </Flex>
          </Inset>
        </Theme>
      </Card>
    </PageContainer>
  );
};

export default connectStore()(Dashboard);
