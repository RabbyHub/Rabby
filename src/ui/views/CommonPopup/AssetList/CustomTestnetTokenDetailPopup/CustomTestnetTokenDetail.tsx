import { CustomTestnetToken } from '@/background/service/customTestnet';
import IconUnknown from '@/ui/assets/token-default.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { useRabbySelector } from '@/ui/store';
import { findChain } from '@/utils/chain';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
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
            <img
              src={IconUnknown}
              alt=""
              className="rounded-full w-[24px] h-[24px]"
            />
            <div className="token-symbol ml-8" title={token.symbol}>
              {ellipsisOverflowedText(token.symbol || '', 8)}
            </div>
          </div>
          <div className="address">
            <img
              src={chain?.logo || IconUnknown}
              className="w-[14px] h-[14px]"
              alt=""
            />
            {!isNativeToken ? (
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
              token.symbol
            )}
          </div>
        </div>
        {isNativeToken ? null : (
          <CustomizedButton
            selected={isAdded}
            onOpen={() => addToken(token)}
            onClose={() => removeToken(token)}
          />
        )}
        <div className="balance">
          <div className="balance-title">
            {token.symbol} {t('page.newAddress.hd.balance')}
          </div>
          <div className="balance-content overflow-hidden">
            <TooltipWithMagnetArrow
              className="rectangle w-[max-content]"
              title={(token.amount || 0).toString()}
              placement="bottom"
            >
              <div className="balance-value truncate">
                {splitNumberByStep((token.amount || 0)?.toFixed(8))}
              </div>
            </TooltipWithMagnetArrow>
          </div>
        </div>

        <div className="flex flex-row justify-between mt-[12px]">
          <Tooltip
            overlayClassName="rectangle token_swap__tooltip"
            placement="topLeft"
            title={t('page.dashboard.tokenDetail.notSupported')}
          >
            <Button
              type="primary"
              size="large"
              disabled
              className="w-[114px] h-[36px] leading-[16px]"
              style={{
                width: 114,
                height: 36,
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
      </div>
    </div>
  );
};
