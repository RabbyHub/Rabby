import { CHAINS_ENUM } from '@/types/chain';
import { ReactComponent as RcIconArrowRightCC } from '@/ui/assets/receive/right-cc.svg';
import { Modal } from '@/ui/component';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { SeedPhraseBackupAlert } from '@/ui/component/SeedPhraseBackupAlert';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { copyAddress } from '@/ui/utils/clipboard';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { OfflineChainNotify } from '@/ui/views/Dashboard/components/OfflineChainNotify';
import { findChain, findChainByEnum, getChainList } from '@/utils/chain';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import { useRequest } from 'ahooks';
import { Button } from 'antd';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import {
  KEYRING_CLASS,
  KEYRING_ICONS_WHITE,
  WALLET_BRAND_CONTENT,
} from 'consts';
import QRCode from 'qrcode.react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory } from 'react-router-dom';
import { ReactComponent as IconBack } from 'ui/assets/back.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy-1-cc.svg';
import IconEyeHide from 'ui/assets/icon-eye-hide.svg';
import IconEye from 'ui/assets/icon-eye.svg';
import { ReactComponent as RcIconWarning } from 'ui/assets/icon-warning-large.svg';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import './style.less';
import { sortBy } from 'lodash';
import { EditCustomTestnetModal } from '../CustomTestnet/components/EditTestnetModal';
import { useThemeMode } from '@/ui/hooks/usePreference';

const useAccount = () => {
  const wallet = useWallet();

  const [account, setAccount] = useState<Account | null>(null);
  const [address, setAddress] = useState<string>();
  const [name, setName] = useState<string>();
  const [cacheBalance, setCacheBalance] = useState<number>();
  const [balance, setBalance] = useState<number>();
  useEffect(() => {
    wallet.syncGetCurrentAccount().then((a) => {
      setAccount(a);
      setAddress(a!.address.toLowerCase());
    });
  }, []);
  useEffect(() => {
    if (address) {
      wallet.getAlianName(address).then(setName);

      wallet
        .getAddressCacheBalance(address)
        .then((d) => setCacheBalance(d?.total_usd_value || 0));
      wallet
        .getInMemoryAddressBalance(address)
        .then((d) => setBalance(d.total_usd_value));
    }
  }, [address]);

  return {
    ...account,
    address,
    name,
    balance: balance ?? cacheBalance,
  };
};

const Receive = () => {
  const wallet = useWallet();
  const history = useHistory();
  const rbisource = useRbiSource();
  const [isShowAccount, setIsShowAccount] = useState(true);
  const [isShowAddTestnetModal, setIsShowAddTestnetModal] = useState(false);
  const { isDarkTheme } = useThemeMode();

  const account = useAccount();
  const qs = useMemo(() => query2obj(history.location.search), [
    history.location.search,
  ]);
  const [chainEnum, setChainEnum] = useState<CHAINS_ENUM | undefined>(
    qs.chain ? (qs.chain as CHAINS_ENUM) : undefined
  );
  const chain = useMemo(() => findChainByEnum(chainEnum), [chainEnum]);
  const [isShowReceiveModal, setIsShowReceiveModal] = useState(false);

  const { t } = useTranslation();

  const {
    data: safeSupportChains,
    loading: safeSupportChainsLoading,
  } = useRequest(
    async () => {
      if (!account?.address || account.type !== KEYRING_CLASS.GNOSIS) {
        return;
      }
      const chainIds = await wallet.getGnosisNetworkIds(account.address);
      const chains: CHAINS_ENUM[] = [];
      chainIds.forEach((id) => {
        const chain = findChain({
          networkId: id,
        });
        if (chain) {
          chains.push(chain.enum);
        }
      });
      return chains;
    },
    {
      refreshDeps: [account?.address, account?.type],
    }
  );

  const isSafeSupportChainsReady =
    !!account.address &&
    (account.type !== KEYRING_CLASS.GNOSIS ||
      (!safeSupportChainsLoading && safeSupportChains !== undefined));

  const displayChains = useMemo(() => {
    if (!isSafeSupportChainsReady) {
      return [];
    }

    let list = getChainList('mainnet');
    if (safeSupportChains) {
      list = list.filter((item) => safeSupportChains.includes(item.enum));
    }

    const pinedList = [
      CHAINS_ENUM.ETH,
      CHAINS_ENUM.BASE,
      CHAINS_ENUM.ARBITRUM,
      CHAINS_ENUM.OP,
      CHAINS_ENUM.BSC,
    ];
    list = sortBy(list, (item) => {
      const idx = pinedList.indexOf(item.enum);
      return idx === -1 ? pinedList.length + 1 : idx;
    });
    if (chain && list.some((item) => item.enum === chain.enum)) {
      list = [chain, ...list.filter((item) => item.enum !== chain.enum)];
    }
    return list;
  }, [chain, isSafeSupportChainsReady, safeSupportChains]);

  const shownChains = useMemo(() => {
    return displayChains.slice(0, 5);
  }, [displayChains]);

  const restChainCount = displayChains.length - shownChains.length;

  const handleCopyAddress = () => {
    matomoRequestEvent({
      category: 'Receive',
      action: 'copyAddress',
      label: [
        chain,
        getKRCategoryByType(account?.type),
        account?.brandName,
        filterRbiSource('Receive', rbisource) && rbisource,
      ].join('|'),
    });
    copyAddress(account.address!);
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();

    if (!account) {
      history.replace('/');
      return;
    }
  };
  useEffect(() => {
    init();
  }, []);
  useEffect(() => {
    if (account?.address) {
      matomoRequestEvent({
        category: 'Receive',
        action: 'getQRCode',
        label: [
          chain,
          getKRCategoryByType(account?.type),
          account?.brandName,
          filterRbiSource('Receive', rbisource) && rbisource,
        ].join('|'),
      });
    }
  }, [account?.address]);
  useEffect(() => {
    if (account?.type !== KEYRING_CLASS.WATCH) {
      return;
    }
    const modal = Modal.info({
      maskClosable: false,
      closable: false,
      className: 'page-receive-modal modal-support-darkmode',
      content: (
        <div>
          <ThemeIcon className="icon" src={RcIconWarning} />
          <div className="content">
            {t('page.receive.watchModeAlert1')}
            <br />
            {t('page.receive.watchModeAlert2')}
          </div>
          <div className="footer">
            <Button
              type="primary"
              block
              onClick={() => {
                modal.destroy();
                history.goBack();
              }}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              className="rabby-btn-ghost"
              ghost
              block
              onClick={() => {
                modal.destroy();
              }}
            >
              {t('global.Confirm')}
            </Button>
          </div>
        </div>
      ),
    });
    return () => {
      modal.destroy();
    };
  }, [account?.type]);
  return (
    <>
      <div className="page-receive bg-r-blue-default dark:bg-r-blue-disable relative">
        <div className="page-nav">
          <div
            className="page-nav-left pointer"
            onClick={() => {
              history.goBack();
            }}
          >
            <IconBack className="icon-back"></IconBack>
          </div>
          {isShowAccount && (
            <div className="page-nav-content">
              <div className="account">
                <img
                  className="account-icon opacity-60"
                  src={
                    WALLET_BRAND_CONTENT[account.brandName as string]?.image ||
                    KEYRING_ICONS_WHITE[account.type as string]
                  }
                />
                <div className="account-content">
                  <div className="row">
                    <div className="account-name" title={account.name}>
                      {account.name}
                    </div>
                    <div
                      className="account-balance truncate"
                      title={splitNumberByStep(
                        (account.balance || 0).toFixed(2)
                      )}
                    >
                      ${splitNumberByStep((account.balance || 0).toFixed(2))}
                    </div>
                  </div>
                  {account.type === KEYRING_CLASS.WATCH && (
                    <div className="account-type">
                      {t('global.watchModeAddress')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <div
            className="page-nav-right pointer"
            onClick={() => {
              setIsShowAccount((v) => !v);
            }}
          >
            {isShowAccount ? <img src={IconEye} /> : <img src={IconEyeHide} />}
          </div>
        </div>

        <SeedPhraseBackupAlert
          className={clsx(
            'text-r-red-default bg-r-red-light rounded-[8px]',
            'mb-[8px] mt-[-12px]'
          )}
        />
        <OfflineChainNotify
          className="receive-offline-chain-notify w-full"
          itemClassName="rounded-[8px] mb-[8px]"
        />

        <div className="qr-card">
          <div className="qr-card-header">
            <div className="text-[17px] leading-[20px] font-medium text-r-neutral-title1">
              {t('page.receive.receiveTitle', {
                token: qs.token || t('global.assets'),
              })}
            </div>
          </div>
          <div className="qr-card-img">
            {account?.address && <QRCode value={account.address} size={174} />}
          </div>
          <div className="qr-card-address">{account?.address}</div>
          <button
            type="button"
            className="qr-card-btn"
            onClick={handleCopyAddress}
          >
            <ThemeIcon src={RcIconCopy} className="icon-copy" />
            {t('global.copyAddress')}
          </button>
          <div className="qr-card-divider" />
          <div
            className="qr-card-chain"
            onClick={() => {
              if (isSafeSupportChainsReady) {
                setIsShowReceiveModal(true);
              }
            }}
          >
            <div className="qr-card-chain-label">
              {t('page.receive.supportedChain')}
            </div>
            <div className="qr-card-chain-list">
              {shownChains.map((item) => (
                <img
                  key={item.enum}
                  src={item.logo}
                  alt={item.name}
                  className="qr-card-chain-logo"
                />
              ))}
              {restChainCount > 0 && (
                <span className="qr-card-chain-count">+{restChainCount}</span>
              )}
              {isSafeSupportChainsReady && (
                <RcIconArrowRightCC className="qr-card-chain-arrow" />
              )}
            </div>
          </div>
        </div>
        {qs.isZero ? (
          <footer className="flex justify-center items-center mt-[16px]">
            <button
              type="button"
              onClick={() => {
                setIsShowAddTestnetModal(true);
              }}
              className={clsx(
                'text-r-neutral-title-2 text-[13px] leading-[16px] underline underline-offset-auto',
                'py-[8px] px-[16px] rounded-[6px]',
                'hover:bg-[rgba(255,255,255,0.12)] active:bg-[rgba(255,255,255,0.2)]'
              )}
            >
              {t('page.receive.addCustomNetwork')}
            </button>
          </footer>
        ) : (
          <div className="page-receive-footer hidden">
            <img
              src="/images/logo-white.svg"
              className="h-[28px] opacity-50"
              alt=""
            />
          </div>
        )}
        <ChainSelectorModal
          className="receive-chain-select-modal"
          showClosableIcon={false}
          value={chainEnum}
          visible={isShowReceiveModal}
          showRPCStatus
          onChange={(chain) => {
            setChainEnum(chain);
            setIsShowReceiveModal(false);
          }}
          onCancel={() => {
            setIsShowReceiveModal(false);
          }}
          supportChains={
            account.type === KEYRING_CLASS.GNOSIS
              ? safeSupportChains || []
              : safeSupportChains
          }
          disabledTips={t(
            'page.dashboard.GnosisWrongChainAlertBar.notDeployed'
          )}
        />
      </div>
      <EditCustomTestnetModal
        ctx={{
          ga: {
            source: 'receive',
          },
        }}
        visible={isShowAddTestnetModal}
        onCancel={() => {
          setIsShowAddTestnetModal(false);
        }}
        onConfirm={() => {
          setIsShowAddTestnetModal(false);
        }}
        height={500}
        maskStyle={
          isDarkTheme
            ? {
                backgroundColor: 'transparent',
              }
            : undefined
        }
      />
    </>
  );
};

export default Receive;
