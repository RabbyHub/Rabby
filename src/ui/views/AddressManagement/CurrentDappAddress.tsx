import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getOriginFromUrl } from '@/utils';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM, KEYRING_TYPE } from 'consts';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import IconDapps from 'ui/assets/dapps.svg';
import { ReactComponent as RCIconDisconnectCC } from 'ui/assets/dashboard/current-connection/cc-disconnect.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-circle.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useAlias, useWallet } from 'ui/utils';
import './style.less';
import { findChain } from '@/utils/chain';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useMemoizedFn } from 'ahooks';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { AccountSelectorModal } from '@/ui/component/AccountSelector/AccountSelectorModal';
import { useBrandIcon } from '@/ui/hooks/useBrandIcon';
import { ReactComponent as RcArrowDownSVG } from '@/ui/assets/dashboard/arrow-down-cc.svg';

export const CurrentDappAddress = memo(() => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [site, setSite] = useState<ConnectedSite | null>(null);
  const { state } = useLocation<{
    trigger?: string;
    showChainsModal?: boolean;
  }>();

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab.url);
    const current = await wallet.getCurrentSite(tab.id, domain);
    setSite(current);
  }, []);

  const currentAccount = useCurrentAccount();

  const currentSiteAccount = site?.account ? site.account : currentAccount;

  const [visible, setVisible] = useState(false);

  const handleSiteAccountChange = useMemoizedFn(async (account) => {
    if (!site) {
      return;
    }
    const _site = {
      ...site!,
      account,
    };
    setSite(_site);
    wallet.setSiteAccount({ origin: _site.origin, account });
    setVisible(false);
  });

  useEffect(() => {
    getCurrentSite();
  }, []);

  const chain = useMemo(() => {
    if (!site || site.isMetamaskMode || !site.isConnected) {
      return null;
    }
    return findChain({
      enum: site.chain || CHAINS_ENUM.ETH,
    });
  }, [site]);

  if (!site?.isConnected || !currentSiteAccount) {
    return null;
  }

  return (
    <div className="px-[20px] mt-[12px] cursor-pointer">
      <div
        className={clsx(
          'flex items-center gap-[20px]',
          'p-[11px] rounded-[8px] border-[1px] border-transparent border-solid bg-r-neutral-card-1',
          'hover:bg-r-blue-light1 hover:border-rabby-blue-default'
        )}
        onClick={() => {
          setVisible(true);
        }}
      >
        <div className="flex items-center gap-[8px] flex-shrink-0">
          <div className="relative">
            <FallbackSiteLogo
              url={site.icon}
              origin={site.origin}
              width="16px"
              className="rounded-full"
            ></FallbackSiteLogo>
            {chain ? (
              <div className="absolute bottom-[-2px] right-[-2px]">
                <img
                  src={chain.logo}
                  alt="chain logo"
                  className="rounded-full w-[10px] h-[10px]"
                />
              </div>
            ) : null}
          </div>
          <div className="text-[13px] leading-[16px] text-r-neutral-body">
            {t('page.manageAddress.CurrentDappAddress.desc')}
          </div>
        </div>
        <CurrentAccount currentSiteAccount={currentSiteAccount} />
      </div>
      <AccountSelectorModal
        value={currentSiteAccount}
        visible={visible}
        onChange={handleSiteAccountChange}
        onCancel={() => {
          setVisible(false);
        }}
      />
    </div>
  );
});

const CurrentAccount = ({
  currentSiteAccount,
}: {
  currentSiteAccount: Account;
}) => {
  const addressTypeIcon = useBrandIcon({
    address: currentSiteAccount.address,
    brandName: currentSiteAccount.brandName,
    type: currentSiteAccount.type,
    forceLight: false,
  });

  const [alias] = useAlias(currentSiteAccount.address);

  return (
    <div className="flex items-center gap-[4px] ml-auto">
      <img src={addressTypeIcon} className="w-[16px] h-[16px]" alt="" />
      <div className="truncate text-[13px] leading-[16px] text-r-neutral-body">
        {alias}
      </div>
      <RcArrowDownSVG
        className="w-[14px] h-[14px] text-r-neutral-foot"
        style={{
          transform: 'rotate(-90deg)',
        }}
      />
    </div>
  );
};
