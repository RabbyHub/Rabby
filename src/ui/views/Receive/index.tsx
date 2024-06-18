import { Modal } from '@/ui/component';
import { Button, message } from 'antd';
import { Account } from 'background/service/preference';
import ClipboardJS from 'clipboard';
import {
  CHAINS,
  KEYRING_CLASS,
  KEYRING_ICONS_WHITE,
  WALLET_BRAND_CONTENT,
} from 'consts';
import QRCode from 'qrcode.react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ReactComponent as IconBack } from 'ui/assets/back.svg';
import { ReactComponent as RcIconCopy } from 'ui/assets/icon-copy-1-cc.svg';
import IconEyeHide from 'ui/assets/icon-eye-hide.svg';
import IconEye from 'ui/assets/icon-eye.svg';
import IconSuccess from 'ui/assets/icon-success-1.svg';
import { ReactComponent as RcIconWarning } from 'ui/assets/icon-warning-large.svg';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { query2obj } from 'ui/utils/url';
import './style.less';
import { getKRCategoryByType } from '@/utils/transaction';
import { filterRbiSource, useRbiSource } from '@/ui/utils/ga-event';
import { findChainByEnum } from '@/utils/chain';
import { useTranslation } from 'react-i18next';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { copyAddress } from '@/ui/utils/clipboard';

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

const useReceiveTitle = (search: string) => {
  const { t } = useTranslation();
  const qs = useMemo(() => query2obj(search), [search]);
  const chain = findChainByEnum(qs.chain)?.name || 'Ethereum';
  const token = qs.token || t('global.assets');

  return t('page.receive.title', {
    chain,
    token,
  });
};

const Receive = () => {
  const wallet = useWallet();
  const history = useHistory();
  const rbisource = useRbiSource();
  const [isShowAccount, setIsShowAccount] = useState(true);

  const account = useAccount();
  const title = useReceiveTitle(history.location.search);
  const qs = useMemo(() => query2obj(history.location.search), [
    history.location.search,
  ]);
  const chain = findChainByEnum(qs.chain)?.name ?? 'Ethereum';

  const { t } = useTranslation();

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
    <div className="page-receive bg-r-blue-default dark:bg-r-blue-disable">
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
                    title={splitNumberByStep((account.balance || 0).toFixed(2))}
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

      <div className="qr-card">
        <div className="qr-card-header">{title}</div>
        <div className="qr-card-img">
          {account?.address && <QRCode value={account.address} size={175} />}
        </div>
        <div className="qr-card-address">{account?.address}</div>
        <button
          type="button"
          className="qr-card-btn"
          onClick={handleCopyAddress}
        >
          <ThemeIcon
            src={RcIconCopy}
            className="icon-copy text-r-neutral-title-1"
          />
          {t('global.copyAddress')}
        </button>
      </div>
      <div className="page-receive-footer">
        <img
          src="/images/logo-white.svg"
          className="h-[28px] opacity-50"
          alt=""
        />
      </div>
    </div>
  );
};

export default Receive;
