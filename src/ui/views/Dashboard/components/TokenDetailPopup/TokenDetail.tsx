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
import { useHistory } from 'react-router-dom';
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
import { TokenPriceChart } from './TokenPriceChart';
import TokenChainAndContract from './TokenInfo';

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
  const [tokenEntity, setTokenEntity] = React.useState<TokenEntityDetail>();

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

  const getTokenEntity = React.useCallback(async () => {
    const info = await wallet.openapi.getTokenEntity(token.id, token.chain);
    if (info) {
      setTokenEntity(info);
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
              <TooltipWithMagnetArrow
                title={getChain(token?.chain)?.name}
                className="rectangle w-[max-content]"
              >
                <img
                  className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                  src={getChain(token?.chain)?.logo || IconUnknown}
                />
              </TooltipWithMagnetArrow>
            </div>

            <div className="token-symbol ml-8" title={getTokenSymbol(token)}>
              {ellipsisOverflowedText(getTokenSymbol(token), 8)}
            </div>
          </div>
        </div>
      </div>

      <div
        ref={ref}
        className={clsx('token-detail-body flex flex-col gap-12', 'pt-[0px]')}
      >
        <div className="mx-5 mt-3 flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
          <div className="balance-content overflow-hidden flex flex-col gap-8 px-12 py-16">
            <div className="flex flex-row justify-between w-full">
              <div className="balance-title">
                {t('page.dashboard.tokenDetail.myBalance')}
              </div>
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
            </div>
            <div className="flex flex-row justify-between w-full">
              <div className="flex flex-row gap-8 items-center">
                <TokenWithChain
                  token={token}
                  hideConer
                  hideChainIcon={true}
                  width="24px"
                  height="24px"
                ></TokenWithChain>
                <TooltipWithMagnetArrow
                  className="rectangle w-[max-content]"
                  title={(tokenWithAmount.amount || 0).toString()}
                  placement="bottom"
                >
                  <div className="balance-value truncate">
                    {splitNumberByStep(
                      (tokenWithAmount.amount || 0)?.toFixed(8)
                    )}{' '}
                    {getTokenSymbol(token)}
                  </div>
                </TooltipWithMagnetArrow>
              </div>
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
        <TokenChainAndContract
          token={token}
          tokenEntity={tokenEntity}
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
            <div className="token-txs-history__empty mt-60">
              <img className="no-data" src="./images/nodata-tx.png" />
              <p className="text-14 text-gray-content mt-12">
                {t('page.dashboard.tokenDetail.noTransactions')}
              </p>
            </div>
          )}
        </div>
      </div>
      {!isHiddenButton && !hideOperationButtons && (
        <div className="flex flex-row justify-between J_buttons_area relative height-[80px] px-20 py-16 ">
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
    </div>
  );
};

export default TokenDetail;
