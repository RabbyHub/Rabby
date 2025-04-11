import { CustomTestnetToken } from '@/background/service/customTestnet';
import IconUnknown from '@/ui/assets/token-default.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useRabbySelector } from '@/ui/store';
import IconNoFind from 'ui/assets/tokenDetail/IconNoFind.svg';
import { findChain } from '@/utils/chain';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
import { Image } from 'antd';
import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ReactComponent as RcIconExternal } from 'ui/assets/icon-share-currentcolor.svg';
import { Copy } from 'ui/component';
import {
  ellipsisOverflowedText,
  getUITypeName,
  openInTab,
  splitNumberByStep,
  useCommonPopupView,
  useWallet,
} from 'ui/utils';
import { CustomizedButton } from './CustomizedButton';
import './style.less';
import { getAddressScanLink } from '@/utils';
import { BlockedTopTips } from '@/ui/views/Dashboard/components/TokenDetailPopup/BlockedTopTips';
import { TokenCharts } from '@/ui/component/TokenChart';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import TokenChainAndContract from '@/ui/views/Dashboard/components/TokenDetailPopup/TokenInfo';
import { CustomizedSwitch } from '@/ui/views/Dashboard/components/TokenDetailPopup/CustomizedButton';

const PAGE_COUNT = 10;
const ellipsis = (text: string) => {
  return text.replace(/^(.{6})(.*)(.{4})$/, '$1...$3');
};

interface TokenDetailProps {
  onClose?(): void;
  token: CustomTestnetToken;
  addToken(token: CustomTestnetToken): void;
  removeToken(token: CustomTestnetToken): void;
  variant?: 'add';
  isAdded?: boolean;
  canClickToken?: boolean;
  hideOperationButtons?: boolean;
}

export const CustomTestnetTokenDetail = ({
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

  const ref = useRef<HTMLDivElement | null>(null);
  const chain = findChain({
    id: token.chainId,
  });

  const handleClickLink = (token: CustomTestnetToken) => {
    if (!chain) return;
    const needClose = getUITypeName() !== 'notification';
    openInTab(getAddressScanLink(chain.scanLink, token.id), needClose);
  };

  const isNativeToken = !/^0x.{40}$/.test(token.id);
  const { setVisible } = useCommonPopupView();

  const history = useHistory();
  const goToSend = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/send-token?rbisource=tokendetail&token=${chain?.serverId}:${token?.id}`
    );
  }, [history, token]);

  const goToReceive = useCallback(() => {
    setVisible(false);
    onClose?.();
    history.push(
      `/receive?rbisource=tokendetail&chain=${chain?.enum}&token=${token?.symbol}`
    );
  }, [history, token]);

  return (
    <div className="custom-testnet-token-detail" ref={ref}>
      <div className={clsx('token-detail-header', 'border-b-0 pb-24')}>
        <div className={clsx('flex items-center', 'mb-20')}>
          <div className="flex items-center mr-8">
            <div className="relative h-[24px]">
              <Image
                className="w-24 h-24 rounded-full"
                src={token.logo || IconUnknown}
                fallback={IconUnknown}
                preview={false}
              />
              <TooltipWithMagnetArrow
                title={chain?.name}
                className="rectangle w-[max-content]"
              >
                <img
                  className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                  src={chain?.logo || IconUnknown}
                />
              </TooltipWithMagnetArrow>
            </div>

            <div className="token-symbol ml-8" title={token.symbol}>
              {token.symbol}
            </div>
          </div>
        </div>
      </div>
      <div
        ref={ref}
        className={clsx('token-detail-body flex flex-col gap-12', 'pt-[0px]')}
      >
        <BlockedTopTips
          token={(token as any) as TokenItem}
          isAdded={isAdded}
          onOpen={() => addToken(token)}
          onClose={() => removeToken(token)}
        ></BlockedTopTips>
        <TokenCharts token={(token as any) as TokenItem}></TokenCharts>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
          <div className="balance-content overflow-hidden flex flex-col gap-8 px-16 py-12">
            <div className="flex flex-row justify-between w-full">
              <div className="balance-title text-r-neutral-body text-13">
                {t('page.dashboard.tokenDetail.myBalance')}
              </div>
              <div></div>
            </div>
            <div className="flex flex-row justify-between w-full">
              <div className="flex flex-row gap-8 items-center">
                <Image
                  className="w-24 h-24 rounded-full"
                  src={token.logo || IconUnknown}
                  fallback={IconUnknown}
                  preview={false}
                />
                <div className="balance-value truncate">
                  {splitNumberByStep((token.amount || 0)?.toFixed(8))}{' '}
                  {token.symbol}
                </div>
              </div>
              <div></div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
          <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
            <img src={IconNoFind} className="w-14 mr-4" />
            {t('page.dashboard.tokenDetail.noIssuer')}
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
          <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
            <img src={IconNoFind} className="w-14 mr-4" />
            {t('page.dashboard.tokenDetail.NoListedBy')}
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px] gap-12 py-12">
          <div className="text-r-neutral-foot text-13 flex flex-row items-center justify-center w-full">
            <img src={IconNoFind} className="w-14 mr-4" />
            {t('page.dashboard.tokenDetail.NoSupportedExchanges')}
          </div>
        </div>
        <div className="flex flex-col gap-3 bg-r-neutral-card-1 rounded-[8px]">
          <div className="flex flex-row justify-between w-full px-16 py-12">
            <span className="text-r-neutral-body text-[13px] font-normal">
              {t('page.dashboard.tokenDetail.TokenName')}
            </span>
            <span className="text-r-neutral-title-1 text-13 font-medium">
              {token.symbol || ''}
            </span>
          </div>
          <div className="flex flex-row justify-between w-full px-16 py-12">
            <span className="text-r-neutral-body text-[13px] font-normal">
              {t('page.dashboard.tokenDetail.Chain')}
            </span>
            <div className="flex flex-row items-center gap-6">
              <img src={chain?.logo || IconUnknown} className="w-16 h-16" />
              <span className="text-r-neutral-title-1 text-13 font-medium">
                {chain?.name}
              </span>
            </div>
          </div>
          {!isNativeToken && (
            <div className="flex flex-row justify-between w-full px-16 py-12">
              <span className="text-r-neutral-body text-[13px] font-normal">
                {t('page.dashboard.tokenDetail.ContractAddress')}
              </span>
              <div className="flex flex-row items-center gap-6">
                <span className="text-r-neutral-title-1 text-13 font-medium">
                  {ellipsis(token.id)}
                </span>
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
              </div>
            </div>
          )}
          <div className="flex flex-row justify-between w-full px-16 py-12">
            <div className="flex flex-row items-center gap-4">
              <span className="text-r-neutral-body text-[13px] font-normal">
                {'FDV'}
              </span>
            </div>
            <span className="text-r-neutral-title-1 text-13 font-medium">
              {'-'}
            </span>
          </div>
        </div>
        <div className="token-txs-history flex flex-col">
          <div className="token-txs-history__empty bg-r-neutral-card-1 rounded-[8px] pt-[30px] pb-[30px]">
            <img className="no-data" src="./images/nodata-tx.png" />
            <p className="text-14 text-gray-content mt-12">
              {t('page.dashboard.tokenDetail.noTransactions')}
            </p>
          </div>
        </div>
      </div>
      {!isNativeToken ? (
        <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 ">
          <Button
            type="primary"
            size="large"
            onClick={() => addToken(token)}
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
      ) : (
        <div className="flex flex-row justify-between J_buttons_area relative height-[70px] px-20 py-14 ">
          <Tooltip
            overlayClassName="rectangle token_swap__tooltip"
            placement="topLeft"
            title={t('page.dashboard.tokenDetail.notSupported')}
          >
            <Button
              type="primary"
              size="large"
              disabled
              className="w-[114px] h-[40px] leading-[18px]"
              style={{
                width: 114,
                height: 40,
                lineHeight: '16px',
              }}
            >
              {t('page.dashboard.tokenDetail.swap')}
            </Button>
          </Tooltip>

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
      )}
    </div>
  );
};
