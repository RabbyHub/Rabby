import { useInfiniteScroll } from 'ahooks';
import { Button } from 'antd';
import { TokenItem, TxHistoryResult } from 'background/service/openapi';
import clsx from 'clsx';
import { last } from 'lodash';
import React, { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { Copy, TokenWithChain } from 'ui/component';
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
}

const TokenDetail = ({
  token,
  addToken,
  removeToken,
  variant,
  isAdded,
  onClose,
  canClickToken = true,
  hideOperationButtons = false,
}: TokenDetailProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { currentAccount } = useRabbySelector((s) => s.account);
  const [tokenWithAmount, setTokenWithAmount] = React.useState<TokenItem>(
    token
  );

  const tokenSupportSwap = useMemo(() => {
    const tokenChain = getChain(token?.chain)?.enum;
    return !!tokenChain && SWAP_SUPPORT_CHAINS.includes(tokenChain as any);
  }, [token]);

  const ref = useRef<HTMLDivElement | null>(null);

  const getTokenAmount = React.useCallback(async () => {
    if (token.amount !== undefined) return;
    const info = await wallet.openapi.getToken(
      currentAccount!.address,
      token.chain,
      token.id
    );
    if (info) {
      setTokenWithAmount({
        ...token,
        amount: info.amount,
      });
    }
  }, [token]);

  React.useEffect(() => {
    if (currentAccount) {
      getTokenAmount();
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

  const handleClickLink = (token: TokenItem) => {
    const serverId = token.chain;
    const chain = findChain({
      serverId: serverId,
    });
    if (!chain) return;
    const link = getAddressScanLink(chain.scanLink, token.id);
    const needClose = getUITypeName() !== 'notification';
    openInTab(link, needClose);
  };

  const isEmpty = (data?.list?.length || 0) <= 0 && !loading;

  const isShowAddress = /^0x.{40}$/.test(token.id);
  const { setVisible } = useCommonPopupView();

  const history = useHistory();
  const goToSend = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/send-token?rbisource=tokendetail&token=${token?.chain}:${token?.id}`
    );
  }, [history, token]);

  const goToReceive = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/receive?rbisource=tokendetail&chain=${
        getChain(token?.chain)?.enum
      }&token=${token?.symbol}`
    );
  }, [history, token]);

  const goToSwap = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/dex-swap?rbisource=tokendetail&chain=${token?.chain}&payTokenId=${token?.id}`
    );
  }, [history, token]);

  const isHiddenButton =
    // Customized and not added
    variant === 'add' && !token.is_core && !isAdded;

  return (
    <div className="token-detail" ref={ref}>
      <div className={clsx('token-detail-header', 'border-b-0 pb-24')}>
        <div className={clsx('flex items-center', 'mb-20')}>
          <div className="flex items-center mr-8">
            <TokenWithChain
              token={token}
              hideConer
              width="24px"
              height="24px"
            ></TokenWithChain>
            <div className="token-symbol ml-8" title={getTokenSymbol(token)}>
              {ellipsisOverflowedText(getTokenSymbol(token), 8)}
            </div>
          </div>
          <div className="address">
            <ChainIcon chain={token.chain}></ChainIcon>
            {isShowAddress ? (
              <>
                {ellipsis(token.id)}
                <ThemeIcon
                  src={RcIconExternal}
                  className="w-14 cursor-pointer"
                  onClick={() => {
                    handleClickLink(token);
                  }}
                />
                <Copy
                  data={token.id}
                  variant="address"
                  className="w-14 cursor-pointer"
                />
              </>
            ) : (
              getChain(token?.chain)?.name
            )}
          </div>
        </div>
      </div>

      <div className={clsx('token-detail-body token-txs-history', 'pt-[0px]')}>
        <div className="token-detail-stickyarea">
          {variant === 'add' ? (
            token.is_core ? (
              <BlockedButton
                selected={isAdded}
                onOpen={() => addToken(tokenWithAmount)}
                onClose={() => removeToken(tokenWithAmount)}
              />
            ) : (
              <CustomizedSwitch
                selected={isAdded}
                onOpen={() => addToken(tokenWithAmount)}
                onClose={() => removeToken(tokenWithAmount)}
              />
            )
          ) : null}
          <div className="balance">
            <div className="balance-title">
              {getTokenSymbol(token)} {t('page.newAddress.hd.balance')}
            </div>
            <div className="balance-content overflow-hidden">
              <TooltipWithMagnetArrow
                className="rectangle w-[max-content]"
                title={(tokenWithAmount.amount || 0).toString()}
                placement="bottom"
              >
                <div className="balance-value truncate">
                  {splitNumberByStep((tokenWithAmount.amount || 0)?.toFixed(8))}
                </div>
              </TooltipWithMagnetArrow>
              <TooltipWithMagnetArrow
                title={`≈ $${(
                  tokenWithAmount.amount * token.price || 0
                ).toString()}`}
                className="rectangle w-[max-content]"
                placement="bottom"
              >
                <div className="balance-value-usd truncate">
                  ≈ $
                  {splitNumberByStep(
                    (tokenWithAmount.amount * token.price || 0)?.toFixed(2)
                  )}
                </div>
              </TooltipWithMagnetArrow>
            </div>
          </div>
        </div>
        {!isHiddenButton && !hideOperationButtons && (
          <div className="flex flex-row justify-between J_buttons_area relative">
            <TooltipWithMagnetArrow
              overlayClassName="rectangle w-[max-content]"
              placement="top"
              arrowPointAtCenter
              title={t('page.dashboard.tokenDetail.notSupported')}
              visible={tokenSupportSwap ? false : undefined}
            >
              <Button
                type="primary"
                size="large"
                onClick={goToSwap}
                disabled={!tokenSupportSwap}
                className="w-[114px] h-[36px] leading-[16px]"
                style={{
                  width: 114,
                  height: 36,
                  lineHeight: '16px',
                }}
              >
                {t('page.dashboard.tokenDetail.swap')}
              </Button>
            </TooltipWithMagnetArrow>

            <Button
              type="primary"
              ghost
              size="large"
              className="w-[114px] h-[36px] leading-[16px] rabby-btn-ghost"
              onClick={goToSend}
            >
              {t('page.dashboard.tokenDetail.send')}
            </Button>
            <Button
              type="primary"
              ghost
              size="large"
              className="w-[114px] h-[36px] leading-[16px] rabby-btn-ghost"
              onClick={goToReceive}
            >
              {t('page.dashboard.tokenDetail.receive')}
            </Button>
          </div>
        )}
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
          <div className="token-txs-history__empty mt-60">
            <img className="no-data" src="./images/nodata-tx.png" />
            <p className="text-14 text-gray-content mt-12">
              {t('page.dashboard.tokenDetail.noTransactions')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenDetail;
