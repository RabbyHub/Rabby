/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useHistory, useLocation } from 'react-router-dom';
import { isValidAddress } from '@ethereumjs/util';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Button, message, Tabs } from 'antd';
import { groupBy } from 'lodash';
import PQueue from 'p-queue';

import { findAccountByPriority } from '@/utils/account';
import { FullscreenContainer } from '@/ui/component/FullscreenContainer';
import { getUiType, isSameAddress, openInternalPageInTab } from '@/ui/utils';
import { PageHeader } from '@/ui/component';
import { connectStore, useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { EnterAddress } from './components/EnterAddress';
import { padWatchAccount } from './util';
import { AddressRiskAlert } from '@/ui/component/AddressRiskAlert';
import { useWallet } from '@/ui/utils/WalletContext';

// icons
import { ReactComponent as RcWhitelistGuardCC } from '@/ui/assets/component/whitelist-guard-cc.svg';

import TabWhitelist from './components/TabWhitelist';

const unimportedBalancesCache: Record<string, number> = {};
const queue = new PQueue({ interval: 1000, intervalCap: 8, concurrency: 8 }); // 每秒最多5个

import './style.less';
import TabImported from './components/TabImported';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { query2obj } from '@/ui/utils/url';
import {
  PwdForNonWhitelistedTxModal,
  VerifyPwdForNonWhitelisted,
} from '@/ui/component/Whitelist/Modal';
import { Account } from '@rabby-wallet/eth-walletconnect-keyring/type';

const OuterInput = styled.div`
  border: 1px solid var(--r-neutral-line);
  &:hover {
    border: 1px solid var(--r-blue-default, #7084ff);
    cursor: text;
  }
`;

const AnimatedInputWrapper = styled.div`
  transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  /* overflow: hidden; */
  will-change: max-height, opacity, transform;
  &.collapsed {
    height: 69px;
    max-height: 69px;
    padding-bottom: 17px;
    opacity: 1;
    transform: scaleY(1);
  }
  &.expanded {
    max-height: 1000px;
    opacity: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    transform: scaleY(1);
  }
`;

const isTab = getUiType().isTab;
const isDesktop = getUiType().isDesktop;
const getContainer =
  isTab || isDesktop ? '.js-rabby-popup-container' : undefined;

function getDefaultState() {
  return {
    showAddressRiskAlert: false,
    address: '',
    addressType: '',
  };
}

const handleGotoSendToken = (
  history: ReturnType<typeof useHistory>,
  address: string,
  type?: string
) => {
  const query = new URLSearchParams(history.location.search);
  query.set('to', address);
  if (type) {
    query.set('type', type);
  } else {
    query.delete('type');
  }
  if (isDesktop) {
    query.set('action', 'send');
    query.set('sendPageType', 'sendToken');
    history.replace(`${history.location.pathname}?${query.toString()}`);
  } else {
    history.replace(`/send-token?${query.toString()}`);
  }
};

const SelectToAddress = () => {
  const history = useHistory();
  const { search } = useLocation();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();
  const { t } = useTranslation();

  const { accountsList, whitelist } = useRabbySelector((s) => ({
    accountsList: s.accountToDisplay.accountsList,
    whitelist: s.whitelist.whitelist,
  }));

  // main state
  const [inputingAddress, setInputingAddress] = useState(false);
  const [selectedAddrInfo, setSelectedAddrInfo] = useState(getDefaultState());

  const [unimportedBalances, setUnimportedBalances] = useState<
    Record<string, number>
  >({});

  const importedWhitelistAccounts = useMemo(() => {
    const groupAccounts = groupBy(accountsList, (item) =>
      item.address.toLowerCase()
    );
    const uniqueAccounts = Object.values(groupAccounts).map((item) =>
      findAccountByPriority(item)
    );
    return [...uniqueAccounts].filter((a) =>
      whitelist?.some((w) => isSameAddress(w, a.address))
    );
  }, [accountsList, whitelist]);

  const unimportedWhitelistAccounts = useMemo(() => {
    return whitelist
      ?.filter(
        (w) =>
          !importedWhitelistAccounts.some((a) => isSameAddress(w, a.address))
      )
      .map((w) => padWatchAccount(w));
  }, [importedWhitelistAccounts, whitelist]);

  const nftItem = useMemo(() => {
    const query = new URLSearchParams(search);
    return query.get('nftItem') || null;
  }, [search]);

  const handleGotoSendNFT = useCallback(
    (address: string) => {
      const query = new URLSearchParams(history.location.search);
      query.set('to', address);
      query.set('nftItem', nftItem || '');
      // avoid again jump send nft when tx done nft amount error
      if (isDesktop) {
        query.set('action', 'send');
        query.set('sendPageType', 'sendNft');
        history.replace(`${history.location.pathname}?${query.toString()}`);
      } else {
        history.replace(`/send-nft?${query.toString()}`);
      }
    },
    [history, nftItem]
  );

  const handleGotoSend = useCallback(
    (address: string, type?: string) => {
      if (nftItem) {
        handleGotoSendNFT(address);
      } else {
        handleGotoSendToken(history, address, type);
      }
    },
    [nftItem, handleGotoSendNFT, history]
  );

  const handleClickBack = useCallback(() => {
    // if (inputingAddress) {
    //   setInputingAddress(false);
    //   return;
    // }
    if (!nftItem) {
      history.goBack();
    } else {
      handleGotoSendNFT('');
    }
  }, [/* inputingAddress,  */ nftItem, history, handleGotoSendNFT]);

  const forceUpdateUnimportedBalances = useCallback(
    async (address: string) => {
      const lowerAddress = address.toLowerCase();
      try {
        const res = await wallet.getInMemoryAddressBalance(lowerAddress);
        const balance = res?.total_usd_value || 0;
        unimportedBalancesCache[lowerAddress] = balance;
        setUnimportedBalances((prev) => ({
          ...prev,
          [lowerAddress]: balance,
        }));
      } catch (e) {
        unimportedBalancesCache[lowerAddress] = 0;
        setUnimportedBalances((prev) => ({
          ...prev,
          [lowerAddress]: 0,
        }));
      }
    },
    [wallet]
  );

  const handleConfirmAccount = useCallback(
    (account?: { address: string; type?: string } | null) => {
      console.debug('[feat] account', account);
      if (!account) return;
      const { address, type } = account;
      setItemToConfirm(null);

      if (!isValidAddress(address)) {
        return;
      }
      forceUpdateUnimportedBalances(address);

      handleGotoSend(address, type);
    },
    [forceUpdateUnimportedBalances, handleGotoSend]
  );

  const isEnabledPwdForNonWhitelistedTx = useRabbySelector(
    (state) => state.preference.isEnabledPwdForNonWhitelistedTx
  );
  const handleSelectAccount = useCallback(
    (account: { address: string; type?: string }) => {
      if (isEnabledPwdForNonWhitelistedTx) {
        setItemToConfirm(account);
        return;
      }

      handleConfirmAccount(account);
    },
    [isEnabledPwdForNonWhitelistedTx, handleConfirmAccount]
  );

  useEffect(() => {
    dispatch.accountToDisplay.getAllAccountsToDisplay();
    dispatch.whitelist.getWhitelistEnabled();
    dispatch.whitelist.getWhitelist();
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    if (
      !unimportedWhitelistAccounts ||
      unimportedWhitelistAccounts.length === 0
    ) {
      return;
    }
    const fetchBalances = async () => {
      queue.clear();
      await Promise.all(
        unimportedWhitelistAccounts.map((acc) =>
          queue.add(async () => {
            if (cancelled) {
              return;
            }
            if (unimportedBalancesCache[acc.address] !== undefined) {
              // 已有缓存，直接set
              setUnimportedBalances((prev) => ({
                ...prev,
                [acc.address]: unimportedBalancesCache[acc.address],
              }));
              return;
            }
            const cachedBalance = await wallet.getAddressCacheBalance(
              acc.address
            );
            if (typeof cachedBalance?.total_usd_value === 'number') {
              unimportedBalancesCache[acc.address] =
                cachedBalance.total_usd_value;
              setUnimportedBalances((prev) => ({
                ...prev,
                [acc.address]: cachedBalance.total_usd_value,
              }));
              return;
            }
            if (!cancelled) {
              forceUpdateUnimportedBalances(acc.address);
            }
          })
        )
      );
    };
    fetchBalances();
    return () => {
      cancelled = true;
      queue.clear();
    };
  }, [forceUpdateUnimportedBalances, unimportedWhitelistAccounts, wallet]);

  const [focusTab, setFocusTab] = useState<'whitelist' | 'imported'>(
    'whitelist'
  );
  useEffect(() => {
    const query = new URLSearchParams(history.location.search);
    const tab = query.get('tab');
    if (!tab) return;
    if (tab === 'imported') {
      setFocusTab('imported');
    } else {
      setFocusTab('whitelist');
    }
  }, [history.location.search]);

  const { isDarkTheme } = useThemeMode();

  const pageTitle = useMemo(() => {
    const query = new URLSearchParams(history.location.search);
    const type = query.get('type');
    if (type === 'send-token') {
      return t('page.selectToAddress.typedTitle.send');
    }
    return t('page.selectToAddress.title');
  }, [history.location.search, t]);

  const [
    isShowNonWhitelistedTxPwdModal,
    setIsShowNonWhitelistedTxPwdModal,
  ] = useState(false);

  const [itemToConfirm, setItemToConfirm] = useState<{
    address: string;
    type?: string;
  } | null>(null);

  return (
    <FullscreenContainer
      className={clsx(isDesktop ? 'h-[600px]' : 'h-[700px]')}
    >
      <div
        className={clsx(
          'send-token select-to-address-page relative overflow-y-scroll',
          isTab || isDesktop
            ? 'w-full h-full overflow-auto min-h-0 rounded-[16px] shadow-[0px_40px_80px_0px_rgba(43,57,143,0.40)'
            : ''
        )}
      >
        <PageHeader
          contentClassName="thin-header"
          onBack={handleClickBack}
          forceShowBack={!(isTab || isDesktop) || inputingAddress}
          canBack={!(isTab || isDesktop) || inputingAddress}
          fixed
        >
          {pageTitle}
        </PageHeader>
        <AnimatedInputWrapper
          className={clsx(
            inputingAddress ? 'expanded' : 'collapsed',
            'px-[20px]'
          )}
        >
          {inputingAddress ? (
            <EnterAddress
              onCancel={() => {
                setInputingAddress(false);
              }}
              onNext={(account, type) =>
                handleSelectAccount({ address: account, type })
              }
            />
          ) : (
            <OuterInput
              className={`
                border border-r-neutral-line rounded-[12px] bg-r-neutral-card1
                text-r-neutral-foot text-[15px] 
                h-[52px] leading-[52px] px-[15px] justify-center items-center
                hover:cursor-text hover:border-r-blue-default
              `}
              onClick={() => setInputingAddress(true)}
            >
              {t('page.selectToAddress.enterAddressOrENS')}
            </OuterInput>
          )}
        </AnimatedInputWrapper>

        {!inputingAddress && (
          <Tabs
            className="w-full select-to-address-tabs"
            centered
            activeKey={focusTab}
            onChange={(key: any) => setFocusTab(key)}
            animated={false}
          >
            <Tabs.TabPane
              key="whitelist"
              // forceRender
              tab={
                <div
                  className={clsx(
                    'flex flex-row items-center justify-center',
                    focusTab === 'whitelist'
                      ? 'text-r-neutral-title1 font-semibold'
                      : 'text-r-neutral-foot'
                  )}
                >
                  <RcWhitelistGuardCC
                    width={18}
                    height={18}
                    className={clsx(
                      'mr-[4px]',
                      focusTab === 'whitelist'
                        ? 'text-r-green-default'
                        : isDarkTheme
                        ? 'text-r-neutral-foot'
                        : 'text-r-neutral-foot'
                    )}
                  />
                  {t('page.selectToAddress.tabs.whitelist')}
                </div>
              }
            >
              <TabWhitelist
                unimportedBalances={unimportedBalances}
                handleChange={handleSelectAccount}
                onManagePwdForNonWhitelistedTx={() => {
                  setIsShowNonWhitelistedTxPwdModal(true);
                }}
              />
            </Tabs.TabPane>

            <Tabs.TabPane
              key="imported"
              // forceRender
              tab={
                <span
                  className={clsx(
                    focusTab === 'imported'
                      ? 'text-r-neutral-title1 font-semibold'
                      : 'text-r-neutral-foot'
                  )}
                >
                  {t('page.selectToAddress.tabs.imported')}
                </span>
              }
            >
              <TabImported handleChange={handleSelectAccount} />
            </Tabs.TabPane>
          </Tabs>
        )}
      </div>
      <PwdForNonWhitelistedTxModal
        visible={isShowNonWhitelistedTxPwdModal}
        onFinish={() => {
          setIsShowNonWhitelistedTxPwdModal(false);
        }}
        onCancel={() => setIsShowNonWhitelistedTxPwdModal(false)}
      />
      <VerifyPwdForNonWhitelisted
        visible={!!itemToConfirm}
        onFinish={() => handleConfirmAccount(itemToConfirm)}
        onCancel={() => setItemToConfirm(null)}
      />
      <AddressRiskAlert
        type={selectedAddrInfo.addressType}
        address={selectedAddrInfo.address}
        title={t('page.selectToAddress.whitelist.notWhitelist')}
        visible={selectedAddrInfo.showAddressRiskAlert}
        getContainer={getContainer}
        height="calc(100% - 60px)"
        onConfirm={async (cexId) => {
          handleGotoSend(
            selectedAddrInfo.address,
            selectedAddrInfo.addressType
          );
          setSelectedAddrInfo(getDefaultState());
          if (cexId) {
            const alias = await wallet.getAlianName(selectedAddrInfo.address);
            wallet.updateAlianName(
              selectedAddrInfo.addressType,
              alias || '',
              cexId
            );
          }
        }}
        onCancel={() => {
          setSelectedAddrInfo(getDefaultState());
        }}
      />
    </FullscreenContainer>
  );
};

export default connectStore()(SelectToAddress);
