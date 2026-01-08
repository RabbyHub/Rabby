import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import clsx from 'clsx';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router-dom';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { DesktopSelectAccountList } from '@/ui/component/DesktopSelectAccountList';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useDesktopBalanceView } from '../DesktopProfile/hooks/useDesktopBalanceView';
import { DesktopPageWrap } from '@/ui/component/DesktopPageWrap';
import { ReactComponent as IconGlobalSiteIconCC } from '@/ui/assets/global-cc.svg';
import { KEYRING_TYPE } from '@/constant';
import { rules } from './rules';
import { AddAddressModal } from '../DesktopProfile/components/AddAddressModal';
import { useAsync } from 'react-use';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import PolyMarketPng from '@/ui/assets/dapp-iframe/polymarket.png';
import { DappIframeLoading } from './component/loading';
import { useThemeMode } from '@/ui/hooks/usePreference';
const HANDSHAKE_MESSAGE_TYPE = 'rabby-dapp-iframe-handshake';
const SYNC_MESSAGE_TYPE = 'rabby-dapp-iframe-sync-url';

const Iframe = styled.iframe`
  width: 100%;
  height: calc(100vh - 116px);
  min-height: 640px;
  border: 0;
  display: block;
  background: var(--rb-neutral-bg-1, #fff);
`;

const createHandshakeToken = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getOriginFromUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  try {
    return new URL(value).origin;
  } catch (err) {
    return '';
  }
};

const getSafeSyncUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch (err) {
    return '';
  }
};

const defaultOrigin = 'https://polymarket.com/';

export const DesktopDappIframe = () => {
  const { isDarkTheme } = useThemeMode();
  const wallet = useWallet();
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handshakeTokenRef = useRef<string>(createHandshakeToken());
  const [isIframeLoading, setIsIframeLoading] = React.useState(true);
  const {
    balance,
    curveChartData,
    isBalanceLoading,
    isCurveLoading,
  } = useDesktopBalanceView({
    address: currentAccount?.address,
  });

  const [defaultUrl] = React.useState(() => {
    const searchParams = new URLSearchParams(location.search);
    const syncUrl = searchParams.get('syncUrl');
    return (
      syncUrl ||
      searchParams.get('url') ||
      searchParams.get('src') ||
      defaultOrigin
    );
  });

  const { iframeSrc, action, syncUrlParam } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const syncUrl = searchParams.get('syncUrl');
    return {
      iframeSrc:
        syncUrl ||
        searchParams.get('url') ||
        searchParams.get('src') ||
        defaultUrl,
      action: searchParams.get('action'),
      syncUrlParam: syncUrl,
    };
  }, [location.search]);
  const iframeOrigin = useMemo(() => getOriginFromUrl(iframeSrc), [iframeSrc]);

  const updateSearchParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(location.search);
      updater(params);
      const next = params.toString();
      const nextPath = next
        ? `${location.pathname}?${next}`
        : location.pathname;
      history.replace(nextPath);
    },
    [history, location.pathname, location.search]
  );

  const handleActionSelect = useCallback(
    (nextAction: 'swap' | 'send' | 'bridge' | 'gnosis-queue') => {
      updateSearchParams((params) => params.set('action', nextAction));
    },
    [updateSearchParams]
  );

  const handleCloseAction = useCallback(() => {
    updateSearchParams((params) => params.delete('action'));
  }, [updateSearchParams]);

  const { value: permission } = useAsync(
    () =>
      currentAccount?.address
        ? wallet.openapi.getPolyMarketPermission({
            id: currentAccount?.address,
          })
        : Promise.resolve({ has_permission: false }),
    []
  );

  console.log('permission', permission?.has_permission);

  useEffect(() => {
    if (
      action === 'gnosis-queue' &&
      currentAccount?.type !== KEYRING_TYPE.GnosisKeyring
    ) {
      handleCloseAction();
    }
  }, [action, currentAccount?.type, handleCloseAction]);

  const syncUrlToQuery = useCallback(
    (nextUrl?: string | null) => {
      const safeUrl = getSafeSyncUrl(nextUrl);
      if (!safeUrl) {
        return;
      }
      const currentSyncUrl = new URLSearchParams(location.search).get(
        'syncUrl'
      );
      if (currentSyncUrl === safeUrl) {
        return;
      }
      updateSearchParams((params) => params.set('syncUrl', safeUrl));
    },
    [location.search, updateSearchParams]
  );

  const postHandshake = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) {
      return;
    }

    console.log('[rabby-desktop] iframeOrigin', iframeOrigin);
    contentWindow.postMessage(
      {
        type: HANDSHAKE_MESSAGE_TYPE,
        token: handshakeTokenRef.current,
        rules: {
          debug: true,
          timeouts: 15 * 1000,
          steps: rules['https://polymarket.com'],
        },
        theme: isDarkTheme ? 'dark' : 'light',
      },
      iframeOrigin
    );
  }, [iframeOrigin, isDarkTheme]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;

      console.log(
        '[rabby-desktop] receive message',
        event.source !== iframeRef.current?.contentWindow,
        !data || typeof data !== 'object',
        event.data,
        data.token !== handshakeTokenRef.current,
        data.type !== SYNC_MESSAGE_TYPE,
        event
      );
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }
      if (!data || typeof data !== 'object') {
        return;
      }
      if (data.type !== SYNC_MESSAGE_TYPE) {
        return;
      }

      if (!data.token) {
        postHandshake();
        setIsIframeLoading(false);

        return;
      }

      if (data.token !== handshakeTokenRef.current) {
        return;
      }
      console.log('[rabby-desktop] handleMessage', event);
      const nextUrl =
        data?.payload?.url || data?.url || data?.syncUrl || data?.href;
      syncUrlToQuery(nextUrl);
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [syncUrlToQuery]);

  useEffect(() => {
    if (!syncUrlParam && iframeSrc) {
      syncUrlToQuery(iframeSrc);
    }
  }, [iframeSrc, syncUrlParam, syncUrlToQuery]);

  (window as any).$$iframeRef = iframeRef.current;

  return (
    <>
      <DesktopPageWrap className="w-full h-full bg-rb-neutral-bg-1 px-[20px] pb-0">
        <div className="main-content flex-1 pl-0">
          <div className="layout-container sticky top-0 z-10 py-[21px] bg-rb-neutral-bg-1">
            <DesktopNav
              balance={balance}
              changePercent={curveChartData?.changePercent}
              isLoss={curveChartData?.isLoss}
              isLoading={isBalanceLoading || isCurveLoading}
              onActionSelect={handleActionSelect}
              showRightItems={false}
            />
          </div>
          <div className="layout-container">
            <div className="">
              <div
                className={clsx(
                  'border border-solid border-rb-neutral-line relative',
                  'rounded-[20px] overflow-hidden'
                )}
              >
                <Iframe ref={iframeRef} src={defaultUrl} />
                {isIframeLoading && (
                  <DappIframeLoading
                    loadingLabel={t('page.dappIfame.openPolymarket')}
                    icon={PolyMarketPng}
                  />
                )}
                {permission && !permission?.has_permission && !isIframeLoading && (
                  <div className="absolute inset-0 bg-[rgba(0,0,0,0.5)] flex flex-col justify-center items-center gap-16">
                    <div className="p-[22px] bg-rb-brand-default rounded-[16px] ">
                      <div className="text-rb-neutral-InvertHighlight text-20 font-medium flex items-center justify-center gap-8">
                        <IconGlobalSiteIconCC
                          viewBox="0 0 24 24"
                          width={24}
                          height={24}
                        />
                        <span>{t('page.dappIfame.serviceUnavailable')}</span>
                      </div>
                      <div className="text-rb-neutral-InvertHighlight text-14">
                        {t('page.dappIfame.predictionNotSupported')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <aside className={clsx('aside-list sticky top-[90px] z-20')}>
          <DesktopSelectAccountList autoCollapse />
        </aside>

        <AddAddressModal
          visible={action === 'add-address'}
          onCancel={() => {
            history.replace(history.location.pathname);
          }}
          destroyOnClose
        />
      </DesktopPageWrap>
    </>
  );
};
