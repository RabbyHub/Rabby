import { useInfiniteScroll } from 'ahooks';
import { Button } from 'antd';
import {
  TokenEntityDetail,
  TokenItem,
  TxHistoryResult,
} from 'background/service/openapi';
import clsx from 'clsx';
import { last } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { Copy, TokenWithChain } from 'ui/component';
import IconUnknown from '@/ui/assets/token-default.svg';
import { Image } from 'antd';
import {
  splitNumberByStep,
  useWallet,
  openInTab,
  useCommonPopupView,
  getUITypeName,
} from 'ui/utils';
import { getAddressScanLink, getChain } from '@/utils';
import ChainIcon from '../NFT/ChainIcon';
import { HistoryItem } from './HistoryItem';
import { Loading } from './Loading';
import './style.less';
import { CHAINS } from 'consts';
import { ellipsisOverflowedText } from 'ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { CustomizedSwitch } from './CustomizedButton';
import { BlockedButton } from './BlockedButton';
import { useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { findChain } from '@/utils/chain';
import TokenChainAndContract from './TokenInfo';
import { TokenCharts } from '@/ui/component/TokenChart';
import { BlockedTopTips } from './BlockedTopTips';
import { ScamTokenTips } from './ScamTokenTips';
import { useGetHandleTokenSelectInTokenDetails } from '@/ui/component/TokenSelector/context';
import { useExternalSwapBridgeDapps } from '@/ui/component/ExternalSwapBridgeDappPopup/hooks';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';

const PAGE_COUNT = 10;
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

interface TokenDetailProps {
  onClose?(): void;
  token: TokenItem;
  addToken(token: TokenItem): void;
  removeToken(token: TokenItem): void;
  variant?: 'add';
  isAdded?: boolean;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
  popupHeight: number;
  tipsFromTokenSelect?: string;
  account?: Account;
}

const TokenDetail = ({
  token,
  addToken,
  removeToken,
  variant,
  isAdded,
  onClose,
  canClickToken = true,
  popupHeight,
  hideOperationButtons = false,
  tipsFromTokenSelect,
  account,
}: TokenDetailProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [entityLoading, setEntityLoading] = React.useState(true);
  const [tokenWithAmount, setTokenWithAmount] = React.useState<TokenItem>(
    token
  );
  const [tokenEntity, setTokenEntity] = React.useState<TokenEntityDetail>();
  const _currentAccount = useCurrentAccount();
  const currentAccount = account || _currentAccount;

  const bridgeSupportedChains = useRabbySelector(
    (s) => s.bridge.supportedChains
  );

  const tokenChain = useMemo(() => {
    return getChain(token?.chain);
  }, [token?.chain]);

  const {
    isSupportedChain,
    data: externalSwapDapps,
  } = useExternalSwapBridgeDapps(tokenChain!.enum, 'swap');

  const tokenSupportSwap = useMemo(
    () => isSupportedChain || externalSwapDapps.length > 0,
    [isSupportedChain, externalSwapDapps]
  );

  const tokenSupportBridge = useMemo(() => {
    const tokenChain = getChain(token?.chain)?.enum;
    return !!tokenChain && bridgeSupportedChains.includes(tokenChain as any);
  }, [token]);

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
    const res: TxHistoryResult = await wallet.openapi.listTxHisotry({
      id: currentAccount!.address,
      chain_id: token.chain,
      start_time: startTime,
      page_count: PAGE_COUNT,
      token_id: token.id,
    });
    const { project_dict, cate_dict, token_dict, history_list: list } = res;
    const displayList = list
      .map((item) => ({
        ...item,
        projectDict: project_dict,
        cateDict: cate_dict,
        tokenDict: token_dict,
      }))
      .sort((v1, v2) => v2.time_at - v1.time_at);
    return {
      last: last(displayList)?.time_at,
      list: displayList,
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

  const isSwap = location.pathname === '/dex-swap';
  const isSend = location.pathname === '/send-token';
  const isBridge = location.pathname === '/bridge';

  const handleInTokenSelect = useGetHandleTokenSelectInTokenDetails();

  const isInSwap = location.pathname === '/dex-swap';
  const isInSend = location.pathname === '/send-token';

  const goToSend = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isInSend && handleInTokenSelect) {
      handleInTokenSelect(token);
    } else {
      history.push(
        `/send-token?rbisource=tokendetail&token=${token?.chain}:${token?.id}`
      );
    }
  }, [history, token, isInSend, handleInTokenSelect]);

  const goToReceive = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/receive?rbisource=tokendetail&chain=${
        getChain(token?.chain)?.enum
      }&token=${token?.symbol}`
    );
  }, [history, token]);

  const gotoBridge = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isBridge && handleInTokenSelect) {
      handleInTokenSelect(token);
    }
  }, [history, token]);

  const goToSwap = useCallback(() => {
    setVisible(false);
    onClose?.();
    if (isInSwap && handleInTokenSelect) {
      handleInTokenSelect(token);
    } else {
      history.push(
        `/dex-swap?rbisource=tokendetail&chain=${token?.chain}&payTokenId=${token?.id}`,
        {
          closeTokenSelect: true,
        }
      );
    }
  }, [history, token, isInSwap, handleInTokenSelect]);

  const isCustomizedNotAdded = useMemo(() => {
    return !token.is_core && !isAdded && variant === 'add';
  }, [token, variant, isAdded]);

  const BottomBtn = useMemo(() => {
    if (hideOperationButtons) {
      return null;
    }

    if (isSwap || isSend || isBridge) {
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

    if (isCustomizedNotAdded) {
      return (
        <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 ">
          <Button
            type="primary"
            size="large"
            onClick={() => addToken(tokenWithAmount)}
            className="w-[360px] h-[40px] leading-[18px]"
            style={{
              width: 360,
              height: 40,
              lineHeight: '18px',
            }}
          >
            {t('page.dashboard.tokenDetail.AddToMyTokenList')}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 ">
        <TooltipWithMagnetArrow
          overlayClassName="rectangle w-[max-content]"
          placement="top"
          arrowPointAtCenter
          title={t('component.externalSwapBrideDappPopup.chainNotSupported')}
          visible={tokenSupportSwap ? false : undefined}
        >
          <Button
            type="primary"
            size="large"
            onClick={goToSwap}
            disabled={!tokenSupportSwap}
            className="w-[114px] h-[40px] leading-[18px]"
            style={{
              width: 114,
              height: 40,
              lineHeight: '18px',
            }}
          >
            {t('page.dashboard.tokenDetail.swap')}
          </Button>
        </TooltipWithMagnetArrow>

        <Button
          type="primary"
          ghost
          size="large"
          className="w-[114px] h-[40px] leading-[18px] rabby-btn-ghost"
          onClick={goToSend}
        >
          {t('page.dashboard.tokenDetail.send')}
        </Button>
        <Button
          type="primary"
          ghost
          size="large"
          className="w-[114px] h-[40px] leading-[18px] rabby-btn-ghost"
          onClick={goToReceive}
        >
          {t('page.dashboard.tokenDetail.receive')}
        </Button>
      </div>
    );
  }, [
    addToken,
    goToReceive,
    goToSend,
    goToSwap,
    hideOperationButtons,
    isCustomizedNotAdded,
    isSwap,
    isBridge,
    gotoBridge,
    isSend,
    tipsFromTokenSelect,
    tokenSupportSwap,
  ]);

  const chain = useMemo(() => getChain(token?.chain), [token?.chain]);

  return (
    <div className="token-detail">
      <div className={clsx('token-detail-header', 'border-b-0 pb-24')}>
        <div className={clsx('flex items-center', 'mb-20')}>
          <div className="flex items-center mr-8">
            <div className="relative h-[24px]">
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
                    className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                    src={chain?.logo}
                  />
                </TooltipWithMagnetArrow>
              ) : null}
            </div>

            <div className="token-symbol ml-8" title={getTokenSymbol(token)}>
              {ellipsisOverflowedText(getTokenSymbol(token), 16)}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className={clsx('token-detail-body flex flex-col gap-12', 'pt-[0px]')}
      >
        <ScamTokenTips token={tokenWithAmount}></ScamTokenTips>
        {variant === 'add' && (
          <BlockedTopTips
            token={token}
            isAdded={isAdded}
            onOpen={() => addToken(tokenWithAmount)}
            onClose={() => removeToken(tokenWithAmount)}
          ></BlockedTopTips>
        )}
        <TokenCharts token={token}></TokenCharts>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
          <div className="balance-content flex flex-col gap-8 px-16 py-12">
            <div className="flex flex-row justify-between w-full">
              <div className="balance-title text-r-neutral-body text-13">
                {t('page.dashboard.tokenDetail.myBalance')}
              </div>
              {variant === 'add' ? (
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
              ) : null}
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
                    <div className="balance-value truncate">
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
              projectDict={item.projectDict}
              cateDict={item.cateDict}
              tokenDict={item.tokenDict}
              key={item.id}
              onClose={onClose}
              canClickToken={canClickToken}
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
    </div>
  );
};

export default TokenDetail;
