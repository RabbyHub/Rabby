import { useInfiniteScroll } from 'ahooks';
import { Button, Dropdown, Menu } from 'antd';
import type { DrawerProps } from 'antd';
import { TokenEntityDetail, TokenItem } from 'background/service/openapi';
import clsx from 'clsx';
import { last, sortBy } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import {
  splitNumberByStep,
  useWallet,
  useCommonPopupView,
  getUiType,
} from 'ui/utils';
import { getChain } from '@/utils';
import { findChain } from '@/utils/chain';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';
import { ellipsisOverflowedText } from 'ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { UnknownTag } from '@/ui/component';
import TokenChainAndContract from './TokenInfo';
import { TokenCharts } from '@/ui/component/TokenChart';
import { ScamTokenTips } from './ScamTokenTips';
import { useGetHandleTokenSelectInTokenDetails } from '@/ui/component/TokenSelector/context';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DbkButton } from '@/ui/views/Ecology/dbk-chain/components/DbkButton';
import { DBK_CHAIN_ID } from '@/constant';
import { isLpToken, isUnknownToken } from '@/ui/utils/portfolio/lpToken';
import { LpTokenTag } from '@/ui/views/DesktopProfile/components/TokensTabPane/components/LpTokenTag';
import { transformToHistory } from '@/utils/history';
import { ReactComponent as RcIconMore } from '@/ui/assets/desktop/profile/more-cc.svg';
import { ReactComponent as RcArrowRight } from '@/ui/assets/arrow-right-cc.svg';
import { useRemovedTokens } from '@/ui/hooks/useRemovedTokens';
import { RemoveTokenConfirmPopup } from './RemoveTokenConfirmPopup';
import { RemovedTokenActions } from './RemovedTokenActions';
import type { RemovedTokenAction } from './RemovedTokenActions';
import { ReactComponent as RcIconSend } from '@/ui/assets/dashboard/panel/send-cc.svg';
import { ReactComponent as RcIconSwap } from '@/ui/assets/dashboard/panel/swap-cc.svg';
import { ReactComponent as RcIconBridge } from '@/ui/assets/tokenDetail/more-bridge.svg';
import { ReactComponent as RcIconReceive } from '@/ui/assets/dashboard/panel/receive-cc.svg';
const isDesktop = getUiType().isDesktop;
const PAGE_COUNT = 10;

interface TokenDetailProps {
  onClose?(): void;
  token: TokenItem;
  variant?: 'add';
  isAdded?: boolean;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
  popupHeight: number;
  tipsFromTokenSelect?: string;
  account?: Account;
  getContainer?: DrawerProps['getContainer'];
}

const TokenDetail = ({
  token,
  variant,
  isAdded,
  onClose,
  canClickToken = true,
  popupHeight,
  hideOperationButtons = false,
  tipsFromTokenSelect,
  account,
  getContainer,
}: TokenDetailProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const isRemoved = useRemovedTokens((state) =>
    state.isTokenRemoved({ tokenId: token.id, chain: token.chain })
  );
  const removedTokensReady = useRemovedTokens((state) => state.isReady);
  const [moreMenuVisible, setMoreMenuVisible] = React.useState(false);
  const [
    removeConfirmToken,
    setRemoveConfirmToken,
  ] = React.useState<TokenItem | null>(null);

  const [entityLoading, setEntityLoading] = React.useState(true);
  const [tokenWithAmount, setTokenWithAmount] = React.useState<TokenItem>(
    token
  );
  const [tokenEntity, setTokenEntity] = React.useState<TokenEntityDetail>();
  const _currentAccount = useCurrentAccount();
  const currentAccount = account || _currentAccount;

  const ref = useRef<HTMLDivElement | null>(null);

  const getTokenAmount = React.useCallback(async () => {
    // if (token.amount !== undefined) return;
    const info = await wallet.openapi.getToken(
      currentAccount!.address,
      token.chain,
      token.id
    );
    if (info) {
      setTokenWithAmount({
        ...token,
        is_suspicious: info.is_suspicious,
        is_verified: info.is_verified,
        amount: info.amount,
      });
    }
  }, [token]);

  const getTokenEntity = React.useCallback(async () => {
    try {
      const info = await wallet.openapi.getTokenEntity(token.id, token.chain);
      if (info) {
        setTokenEntity(info);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEntityLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    if (currentAccount) {
      getTokenAmount();
      getTokenEntity();
    }
  }, [currentAccount, getTokenAmount]);

  const fetchData = async (startTime = 0) => {
    const res = await wallet.openapi.listTxHistory({
      id: currentAccount!.address,
      chain_id: token.chain,
      start_time: startTime,
      page_count: PAGE_COUNT,
      token_id: token.id,
    });
    const displayList = sortBy(
      transformToHistory({
        data: res,
        address: currentAccount!.address,
      }),
      (item) => -item.time_at
    );
    const txs = displayList.map((item) => ({
      chainId: findChain({ serverId: item.chain })?.id,
      hash: item.id,
    }));
    const checks = await wallet
      .checkIsGasDepositTxs(txs)
      .catch(() => [] as boolean[]);
    const list = displayList.map((item, index) => {
      if (!checks[index]) {
        return item;
      }

      return {
        ...item,
        isGasDeposit: true,
      };
    });

    return {
      last: last(list)?.time_at,
      list,
    };
  };

  const { data, loading, loadingMore } = useInfiniteScroll(
    (d) => fetchData(d?.last),
    {
      target: ref,
      isNoMore: (d) => {
        return !d?.last || (d?.list.length || 0) < PAGE_COUNT;
      },
    }
  );

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const { setVisible } = useCommonPopupView();

  const history = useHistory();
  const location = useLocation();

  const action = new URLSearchParams(location.search).get('action');

  const isSwap =
    location.pathname === '/dex-swap' || (action === 'swap' && isDesktop);
  const isSend =
    location.pathname === '/send-token' || (action === 'send' && isDesktop);
  const isBridge =
    location.pathname === '/bridge' || (action === 'bridge' && isDesktop);
  const footerScene = hideOperationButtons
    ? 'hidden'
    : isSwap || isSend || isBridge
    ? 'confirm'
    : 'portfolioDisplay';
  const isPortfolioDisplay = footerScene === 'portfolioDisplay';
  const canRemoveToken = isPortfolioDisplay && !isRemoved;

  React.useEffect(() => {
    setRemoveConfirmToken(null);
    setMoreMenuVisible(false);
  }, [token.id, token.chain, footerScene]);

  const isInDesktopActionModal =
    isDesktop &&
    (action === 'send' || action === 'swap' || action === 'bridge');

  const handleInTokenSelect = useGetHandleTokenSelectInTokenDetails();

  const desktopPathname = location.pathname.startsWith('/desktop/profile')
    ? location.pathname
    : '/desktop/profile';

  const goToSend = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isSend && handleInTokenSelect) {
      handleInTokenSelect(token);
    } else {
      if (isDesktop) {
        history.push(
          `${desktopPathname}?action=send&rbisource=tokendetail&token=${token?.chain}:${token?.id}`
        );
      } else {
        history.push(
          `/send-token?rbisource=tokendetail&token=${token?.chain}:${token?.id}`
        );
      }
    }
  }, [history, token, isSend, handleInTokenSelect, desktopPathname]);

  const goToReceive = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isDesktop) {
      history.push(
        `${desktopPathname}?rbisource=tokendetail&action=receive&chain=${
          getChain(token?.chain)?.enum
        }&token=${token?.symbol}`
      );
    } else {
      history.push(
        `/receive?rbisource=tokendetail&chain=${
          getChain(token?.chain)?.enum
        }&token=${token?.symbol}`
      );
    }
  }, [history, token, isDesktop, desktopPathname]);

  const gotoBridge = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isBridge && handleInTokenSelect) {
      handleInTokenSelect(token);
    } else {
      if (isDesktop) {
        history.push(
          `${desktopPathname}?rbisource=tokendetail&action=bridge&fromChainServerId=${token?.chain}&fromTokenId=${token?.id}`
        );
      } else {
        history.push(
          `/bridge?rbisource=tokendetail&fromChainServerId=${token?.chain}&fromTokenId=${token?.id}`
        );
      }
    }
  }, [history, token, desktopPathname]);

  const goToSwap = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isSwap && handleInTokenSelect) {
      handleInTokenSelect(token);
    } else {
      if (isDesktop) {
        history.push(
          `${desktopPathname}?rbisource=tokendetail&action=swap&chain=${token?.chain}&payTokenId=${token?.id}`
        );
      } else {
        history.push(
          `/dex-swap?rbisource=tokendetail&chain=${token?.chain}&payTokenId=${token?.id}`
        );
      }
    }
  }, [history, token, isSwap, handleInTokenSelect, desktopPathname]);

  const BottomBtn = useMemo(() => {
    if (footerScene === 'hidden') {
      return null;
    }

    if (footerScene === 'confirm') {
      return (
        <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 ">
          <TooltipWithMagnetArrow
            overlayClassName="rectangle w-[max-content]"
            placement="top"
            arrowPointAtCenter
            title={tipsFromTokenSelect || ''}
            visible={!tipsFromTokenSelect ? false : undefined}
          >
            <Button
              type="primary"
              size="large"
              onClick={isBridge ? gotoBridge : isSwap ? goToSwap : goToSend}
              disabled={Boolean(tipsFromTokenSelect)}
              className="w-[360px] h-[40px] leading-[18px]"
              style={{
                width: 360,
                height: 40,
                lineHeight: '18px',
              }}
            >
              {t('global.confirm')}
            </Button>
          </TooltipWithMagnetArrow>
        </div>
      );
    }

    if (isPortfolioDisplay && isRemoved) {
      const actions: RemovedTokenAction[] = [
        {
          key: 'swap',
          title: t('page.dashboard.tokenDetail.swap'),
          Icon: RcIconSwap,
          iconSize: 24,
          iconClassName: '[&_path]:stroke-[2.128944]',
          onClick: goToSwap,
        },
        {
          key: 'bridge',
          title: t('page.dashboard.tokenDetail.bridge'),
          Icon: RcIconBridge,
          iconClassName: '[&_path]:fill-current',
          onClick: gotoBridge,
        },
        {
          key: 'send',
          title: t('page.dashboard.tokenDetail.send'),
          Icon: RcIconSend,
          iconSize: 24,
          iconClassName: '[&_path]:stroke-[2.1]',
          onClick: goToSend,
        },
        {
          key: 'receive',
          title: t('page.dashboard.tokenDetail.receive'),
          Icon: RcIconReceive,
          iconSize: 24,
          iconClassName: '[&_path]:stroke-[2.1]',
          onClick: goToReceive,
        },
      ];

      return (
        <RemovedTokenActions
          key={`${token.chain}:${token.id}`}
          token={token}
          actions={actions}
        />
      );
    }

    return (
      <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 gap-8">
        <Button
          type="primary"
          size="large"
          onClick={goToSwap}
          className="w-[84px] h-[40px] leading-[18px]"
          style={{
            height: 40,
            lineHeight: '18px',
          }}
        >
          {t('page.dashboard.tokenDetail.swap')}
        </Button>
        <Button
          type="primary"
          ghost
          size="large"
          className="w-[84px] h-[40px] leading-[18px] rabby-btn-ghost"
          onClick={gotoBridge}
        >
          {t('page.dashboard.tokenDetail.bridge')}
        </Button>
        <Button
          type="primary"
          ghost
          size="large"
          className="w-[84px] h-[40px] leading-[18px] rabby-btn-ghost"
          onClick={goToSend}
        >
          {t('page.dashboard.tokenDetail.send')}
        </Button>
        <Button
          type="primary"
          ghost
          size="large"
          className="w-[84px] h-[40px] leading-[18px] rabby-btn-ghost"
          onClick={goToReceive}
        >
          {t('page.dashboard.tokenDetail.receive')}
        </Button>
      </div>
    );
  }, [
    isDesktop,
    goToReceive,
    goToSend,
    goToSwap,
    footerScene,
    isSwap,
    isBridge,
    gotoBridge,
    tipsFromTokenSelect,
    isPortfolioDisplay,
    isRemoved,
    token,
    t,
  ]);

  const chain = useMemo(() => getChain(token?.chain), [token?.chain]);
  const isCustomNetworkToken = useMemo(() => {
    return token.id.startsWith('custom');
  }, [token]);

  return (
    <div className="token-detail">
      <div
        className={clsx('token-detail-header', 'border-b-0 pb-24', {
          'can-remove-token': canRemoveToken,
        })}
      >
        {canRemoveToken && (
          <Dropdown
            trigger={['click']}
            placement="bottomRight"
            align={{ offset: [12, 4] }}
            overlayClassName="token-detail-more-menu"
            visible={moreMenuVisible}
            onVisibleChange={setMoreMenuVisible}
            disabled={!removedTokensReady}
            getPopupContainer={(trigger) => trigger.parentElement!}
            overlay={
              <Menu
                onClick={() => {
                  setMoreMenuVisible(false);
                  setRemoveConfirmToken(token);
                }}
                items={[
                  {
                    key: 'remove',
                    label: (
                      <span className="token-detail-more-menu-item">
                        <span>
                          {t('page.dashboard.tokenDetail.removed.removeToken')}
                        </span>
                        <span className="token-detail-more-menu-arrow">
                          <RcArrowRight />
                        </span>
                      </span>
                    ),
                  },
                ]}
              />
            }
          >
            <button
              type="button"
              className="token-detail-more-trigger"
              aria-label={t('page.dashboard.tokenDetail.removed.more')}
              aria-haspopup="menu"
              aria-expanded={moreMenuVisible}
              disabled={!removedTokensReady}
            >
              <RcIconMore />
            </button>
          </Dropdown>
        )}
        <div className={clsx('flex items-center', 'mb-20')}>
          <div className="flex items-center mr-8 min-w-0">
            <div className="relative h-[24px] flex-shrink-0">
              <Image
                className="w-24 h-24 rounded-full"
                src={token.logo_url || IconUnknown}
                fallback={IconUnknown}
                preview={false}
              />
              {chain?.logo ? (
                <TooltipWithMagnetArrow
                  title={chain?.name || ''}
                  className="rectangle w-[max-content]"
                >
                  <img
                    className="w-14 h-14 absolute right-[-2px] bottom-[-2px] rounded-full"
                    src={chain?.logo}
                  />
                </TooltipWithMagnetArrow>
              ) : null}
            </div>

            <div
              className="token-symbol ml-8 truncate"
              title={getTokenSymbol(token)}
            >
              {ellipsisOverflowedText(getTokenSymbol(token), 16)}
            </div>
            {isUnknownToken(token) && (
              <UnknownTag className="ml-8 !px-[8px] !py-[4px] !text-[13px] !leading-[13px] bg-rb-neutral-line" />
            )}
            {isLpToken(token) && (
              <LpTokenTag
                className="ml-8"
                protocolName={token.protocol_id || ''}
              />
            )}
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className={clsx('token-detail-body flex flex-col gap-12', 'pt-[0px]')}
      >
        {isPortfolioDisplay && isRemoved && (
          <div className="token-detail-removed-warning" role="status">
            {t('page.dashboard.tokenDetail.removed.warning')}
          </div>
        )}
        <ScamTokenTips token={tokenWithAmount}></ScamTokenTips>
        {/* {variant === 'add' && !isDesktop && (
          <BlockedTopTips
            token={token}
            isAdded={isAdded}
            onOpen={() => addToken(tokenWithAmount)}
            onClose={() => removeToken(tokenWithAmount)}
          ></BlockedTopTips>
        )} */}
        {!isCustomNetworkToken && <TokenCharts token={token}></TokenCharts>}
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
          <div className="balance-content flex flex-col gap-8 px-16 py-12">
            <div className="flex flex-row justify-between w-full">
              <div className="balance-title text-r-neutral-body text-13">
                {t('page.dashboard.tokenDetail.myBalance')}
              </div>
              {/* {variant === 'add' && !isDesktop ? (
                token.is_core ? (
                  <BlockedButton
                    selected={isAdded}
                    onOpen={() => addToken(tokenWithAmount)}
                    onClose={() => removeToken(tokenWithAmount)}
                  />
                ) : // <CustomizedSwitch
                //   selected={isAdded}
                //   onOpen={() => addToken(tokenWithAmount)}
                //   onClose={() => removeToken(tokenWithAmount)}
                // />
                null
              ) : null} */}
            </div>
            <div className="flex flex-row justify-between w-full items-center">
              <div className="flex flex-row gap-8 items-center">
                <Image
                  className="w-24 h-24 rounded-full"
                  src={token.logo_url || IconUnknown}
                  fallback={IconUnknown}
                  preview={false}
                />
                <div className="relative">
                  <TooltipWithMagnetArrow
                    destroyTooltipOnHide
                    viewportOffset={[50, 0, 0, 0]}
                    className="rectangle w-[max-content]"
                    title={(tokenWithAmount.amount || 0).toString()}
                    placement="bottom"
                  >
                    <div className="balance-value truncate max-w-[200px]">
                      {splitNumberByStep(
                        (tokenWithAmount.amount || 0)?.toFixed(8)
                      )}{' '}
                      {ellipsisOverflowedText(getTokenSymbol(token), 8)}
                    </div>
                  </TooltipWithMagnetArrow>
                </div>
              </div>
              {tokenWithAmount.amount ? (
                <div className="relative">
                  <TooltipWithMagnetArrow
                    viewportOffset={[50, 0, 0, 0]}
                    destroyTooltipOnHide
                    title={`≈ $${(
                      tokenWithAmount.amount * token.price || 0
                    ).toString()}`}
                    placement="bottom"
                    className={clsx(
                      'rectangle w-[max-content]',
                      !tokenWithAmount.amount && ''
                    )}
                  >
                    <div className="balance-value-usd truncate">
                      ≈ $
                      {splitNumberByStep(
                        (tokenWithAmount.amount * token.price || 0)?.toFixed(2)
                      )}
                    </div>
                  </TooltipWithMagnetArrow>
                </div>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </div>
        {token?.chain === 'dbk' ? (
          <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
            <div className="flex items-center justify-between gap-8 px-16 py-10 ">
              <div className="text-r-neutral-title1 text-[13px] font-medium leading-[16px]">
                {t('page.dashboard.tokenDetail.bridgeToEth')}
              </div>
              <DbkButton
                className="rounded-[6px] font-medium text-[13px] leading-[16px] py-[8px] px-[18px]"
                onClick={() => {
                  setVisible(false);
                  onClose?.();
                  history.push(
                    `/ecology/${DBK_CHAIN_ID}/bridge?activeTab=withdraw`
                  );
                }}
              >
                {t('page.dashboard.tokenDetail.bridge')}
              </DbkButton>
            </div>
          </div>
        ) : null}
        <TokenChainAndContract
          entityLoading={entityLoading}
          token={token}
          tokenEntity={tokenEntity}
          popupHeight={popupHeight}
        ></TokenChainAndContract>
        <div className="token-txs-history flex flex-col">
          {data?.list.map((item) => (
            <HistoryItem
              data={item}
              key={item.id}
              onClose={onClose}
              canClickToken={canClickToken}
              isInDesktopActionModal={isInDesktopActionModal}
            ></HistoryItem>
          ))}
          {(loadingMore || loading) && <Loading count={5} active />}
          {isEmpty && (
            <div className="token-txs-history__empty bg-r-neutral-card-1 rounded-[8px] pt-[30px] pb-[30px]">
              <img className="no-data" src="./images/nodata-tx.png" />
              <p className="text-14 text-gray-content mt-12">
                {t('page.dashboard.tokenDetail.noTransactions')}
              </p>
            </div>
          )}
        </div>
      </div>
      {BottomBtn}
      {isPortfolioDisplay && removeConfirmToken && (
        <RemoveTokenConfirmPopup
          token={removeConfirmToken}
          onClose={() => setRemoveConfirmToken(null)}
          getContainer={getContainer}
        />
      )}
    </div>
  );
};

export default TokenDetail;
