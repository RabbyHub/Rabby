import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import clsx from 'clsx';
import styled from 'styled-components';
import { useHistory, useLocation } from 'react-router-dom';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DesktopPageWrap } from '@/ui/component/DesktopPageWrap';
import { ReactComponent as IconGlobalSiteIconCC } from '@/ui/assets/global-cc.svg';
import { KEYRING_TYPE } from '@/constant';
import { rules } from './rules';
import { useAsync } from 'react-use';
import { useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { DappIframeLoading } from './component/loading';
import { DappIframeError } from './component/error';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { DesktopDappSelector } from '@/ui/component/DesktopDappSelector';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { Account } from '@/background/service/preference';
import { DappSelectItem, INNER_DAPP_LIST } from '@/constant/dappIframe';
import { InnerDappType } from '@/background/service';
import { SwitchThemeBtn } from '../DesktopProfile/components/SwitchThemeBtn';

const HANDSHAKE_MESSAGE_TYPE = 'rabby-dapp-iframe-handshake';
const SYNC_MESSAGE_TYPE = 'rabby-dapp-iframe-sync-url';
const IFRAME_LOAD_TIMEOUT = 20 * 1000;
const RULE_OBSERVER_TIMEOUT = 20 * 1000;

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

const getHostFromUrl = (value?: string | null) => {
  if (!value) {
    return '';
  }
  try {
    return new URL(value).hostname;
  } catch (err) {
    return '';
  }
};

type DesktopDappIframeProps = {
  isActive?: boolean;
  url?: string;
  dappList: DappSelectItem[];
  type: InnerDappType;
};

const getDappByDappId = (list: DappSelectItem[], dappId?: string | null) => {
  if (!dappId) {
    return null;
  }
  return list.find((item) => item.id === dappId) || null;
};

export const DesktopInnerDapp = (props: {
  isActive?: boolean;
  type: InnerDappType;
}) => {
  const dappList = useMemo(() => {
    if (props.type === 'prediction') {
      return INNER_DAPP_LIST.PREDICTION;
    }
    if (props.type === 'perps') {
      return INNER_DAPP_LIST.PERPS;
    }
    if (props.type === 'lending') {
      return INNER_DAPP_LIST.LENDING;
    }
    return [];
  }, [props.type]);
  const dappId = useRabbySelector((s) => s.innerDappFrame[props.type]);

  if (!dappList) {
    return null;
  }

  return (
    <DesktopDappIframe
      key={dappId}
      dappList={dappList}
      type={props.type}
      isActive={props.isActive}
    />
  );
};

export const DesktopDappIframe: React.FC<DesktopDappIframeProps> = ({
  isActive = true,
  // url: urlProp,
  dappList: dappListProp,
  type,
}) => {
  const { isDarkTheme } = useThemeMode();
  const wallet = useWallet();
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handshakeTokenRef = useRef<string>(createHandshakeToken());
  const latestSyncUrlRef = useRef<string | null>(null);
  const [iframeError, setIframeError] = React.useState<
    'network' | 'timeout' | null
  >(null);
  const [isIframeLoading, setIsIframeLoading] = React.useState(true);
  const connectedRef = React.useRef(false);

  const [_currentSceneAccount] = useSceneAccount({
    scene: 'prediction',
  });

  const defaultOrigin = dappListProp[0]?.url;

  const dappList = dappListProp;

  const dappId = useRabbySelector((s) => s.innerDappFrame[type]);
  const innerDappFrame = useRabbySelector((s) => s.innerDappFrame);

  const currentDapp = useMemo(
    () => getDappByDappId(dappList, dappId) || dappList[0] || null,
    [dappList, dappId]
  );

  const [defaultUrl] = React.useState(() => {
    const searchParams = new URLSearchParams(location.search);
    const syncUrl = searchParams.get('syncUrl');
    return syncUrl || currentDapp.url || defaultOrigin;
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
  const iframeHost = useMemo(() => getHostFromUrl(iframeSrc), [iframeSrc]);

  const innerDappAccount = useRabbySelector(
    React.useCallback(
      (s) => s.innerDappFrame.innerDappAccounts?.[iframeOrigin],
      [iframeOrigin]
    )
  );

  const dispatch = useRabbyDispatch();

  const switchCurrentSceneAccount = React.useCallback(
    (account: Account) =>
      dispatch.innerDappFrame.setInnerDappAccount([iframeOrigin, account]),
    [dispatch?.innerDappFrame?.setInnerDappAccount, iframeOrigin]
  );

  const currentSceneAccount = React.useMemo(() => {
    return innerDappAccount || _currentSceneAccount;
  }, [innerDappAccount, iframeOrigin, _currentSceneAccount]);

  const dappRules = useMemo(() => {
    if (!currentDapp) {
      return undefined;
    }
    const rulesKey = getOriginFromUrl(currentDapp.url);
    return rules[rulesKey];
  }, [currentDapp]);

  const resetIframeState = useCallback(() => {
    setIframeError(null);
    setIsIframeLoading(true);
    connectedRef.current = false;
    latestSyncUrlRef.current = null;
    handshakeTokenRef.current = createHandshakeToken();
  }, []);

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

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const { value: permission } = useAsync(() => {
    return currentSceneAccount?.address
      ? wallet.openapi.getDappPermission({
          dapp: currentDapp.id,
          id: currentSceneAccount?.address,
        })
      : Promise.resolve({ has_permission: false });
  }, [currentSceneAccount?.address]);

  const hasPermission = permission?.has_permission;

  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (
      action === 'gnosis-queue' &&
      currentSceneAccount?.type !== KEYRING_TYPE.GnosisKeyring
    ) {
      handleCloseAction();
    }
  }, [action, currentSceneAccount?.type, handleCloseAction, isActive]);

  const handleDappSelect = useCallback(
    (nextDappId: string) => {
      const nextDapp = dappList.find((item) => item.id === nextDappId);
      if (!nextDapp) {
        return;
      }
      updateSearchParams((params) => {
        params.set('url', nextDapp?.url);
        params.delete('syncUrl');
      });
      resetIframeState();
    },
    [dappList, resetIframeState, updateSearchParams]
  );

  const syncUrlToQuery = useCallback(
    (nextUrl?: string | null) => {
      const safeUrl = getSafeSyncUrl(nextUrl);
      if (!safeUrl) {
        return;
      }
      latestSyncUrlRef.current = safeUrl;
      if (!isActive) {
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
    [isActive, location.search, updateSearchParams]
  );

  const postHandshake = useCallback(() => {
    const contentWindow = iframeRef.current?.contentWindow;
    if (!contentWindow) {
      return;
    }
    const nextRules = dappRules
      ? {
          debug: true,
          timeouts: RULE_OBSERVER_TIMEOUT,
          steps: dappRules,
        }
      : undefined;

    console.log('[rabby-desktop] iframeOrigin', iframeOrigin);
    contentWindow.postMessage(
      {
        type: HANDSHAKE_MESSAGE_TYPE,
        token: handshakeTokenRef.current,
        ...(nextRules ? { rules: nextRules } : {}),
        theme: isDarkTheme ? 'dark' : 'light',
      },
      iframeOrigin
    );
  }, [dappRules, iframeOrigin, isDarkTheme]);

  useEffect(() => {
    if (!isActive || !isIframeLoading || iframeError) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIframeError('timeout');
      setIsIframeLoading(false);
    }, IFRAME_LOAD_TIMEOUT);
    return () => {
      window.clearTimeout(timer);
    };
  }, [iframeError, isActive, isIframeLoading]);

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
        setIframeError(null);
        connectedRef.current = true;
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
    if (!isActive) {
      return;
    }
    if (!syncUrlParam && iframeSrc) {
      syncUrlToQuery(iframeSrc);
    }
  }, [iframeSrc, isActive, syncUrlParam, syncUrlToQuery]);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    const latestSyncUrl = latestSyncUrlRef.current;
    if (!latestSyncUrl) {
      return;
    }
    const currentSyncUrl = new URLSearchParams(location.search).get('syncUrl');
    if (currentSyncUrl === latestSyncUrl) {
      return;
    }
    updateSearchParams((params) => params.set('syncUrl', latestSyncUrl));
  }, [isActive, location.search, updateSearchParams]);

  return (
    <>
      <DesktopPageWrap className="w-full h-full bg-rb-neutral-bg-1 px-[20px] pb-0">
        <div className="main-content flex-1 pl-0">
          <div className="layout-container flex items-center justify-between">
            <DesktopNav
              onActionSelect={handleActionSelect}
              showRightItems={false}
            />
            <div className="flex items-center gap-[12px]">
              <DesktopDappSelector type={type} />
              <DesktopAccountSelector
                value={currentSceneAccount}
                onChange={switchCurrentSceneAccount}
                scene="prediction"
              />
              <SwitchThemeBtn />
            </div>
          </div>
          <div className="layout-container">
            <div className="">
              <div
                className={clsx(
                  'border border-solid border-rb-neutral-line relative',
                  'rounded-[20px] overflow-hidden'
                )}
              >
                <Iframe
                  allow="clipboard-write"
                  ref={iframeRef}
                  src={defaultUrl}
                  onError={() => {
                    if (!connectedRef.current) {
                      setIsIframeLoading(false);
                      setIframeError('network');
                    }
                  }}
                />
                {isIframeLoading && !iframeError && !hasPermission && (
                  <DappIframeLoading
                    loadingLabel={currentDapp.name}
                    icon={currentDapp.icon}
                  />
                )}
                {iframeError && !hasPermission && (
                  <DappIframeError
                    imageSrc={currentDapp?.icon}
                    title={t('page.dappIfame.networkErrorTitle')}
                    description={
                      iframeHost
                        ? t('page.dappIfame.networkErrorDescription', {
                            site: iframeHost,
                          })
                        : t('page.dappIfame.networkErrorDescriptionFallback')
                    }
                    reloadLabel={t('page.dappIfame.reload')}
                    onReload={handleReload}
                  />
                )}
                {permission && !hasPermission && (
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
      </DesktopPageWrap>
    </>
  );
};
