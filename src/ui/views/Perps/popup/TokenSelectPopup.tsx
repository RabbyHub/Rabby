import React, { CSSProperties } from 'react';
import { message, Modal, Skeleton, Spin } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { formatAmount, formatNumber } from '../../../utils/number';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAsync } from 'react-use';
import { Button, Space, Tooltip } from 'antd';
import clsx from 'clsx';
import { ReactComponent as RcIconArrow } from 'ui/assets/perps/IconArrow.svg';
import { ReactComponent as RcIconLoginLoading } from 'ui/assets/perps/IconLoginLoading.svg';
import { batchQueryTokens } from '@/ui/utils/portfolio/tokenUtils';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
  HYPE_USDC_TOKEN_ID,
  HYPE_USDC_TOKEN_ITEM,
  HYPE_USDC_TOKEN_SERVER_CHAIN,
} from '../constants';
import { useMemoizedFn } from 'ahooks';
import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { FixedSizeList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { PerpsBlueBorderedButton } from '../components/BlueBorderedButton';
import { useThemeMode } from '@/ui/hooks/usePreference';

export type TokenSelectPopupProps = PopupProps & {
  onSelect: (token: TokenItem) => void;
  list: TokenItem[];
  tokenListLoading: boolean;
  changeAccount: () => Promise<void>;
};

export const TokenSelectPopup: React.FC<TokenSelectPopupProps> = ({
  visible,
  onCancel,
  onSelect,
  tokenListLoading,
  list,
  changeAccount,
  ...rest
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const history = useHistory();
  const wallet = useWallet();
  const [clickLoading, setClickLoading] = React.useState(false);

  const isDirectDepositToken = React.useCallback((token: TokenItem) => {
    return (
      (token.id === ARB_USDC_TOKEN_ID &&
        token.chain === ARB_USDC_TOKEN_SERVER_CHAIN) ||
      (token.id === HYPE_USDC_TOKEN_ID &&
        token.chain === HYPE_USDC_TOKEN_SERVER_CHAIN)
    );
  }, []);

  const sortedList = React.useMemo(() => {
    const items = [...(list || [])].filter((t) => t.amount > 0);
    // Sort by USD value descending

    // Ensure ARB USDC and HYPE USDC are always present (even with 0 balance)
    const hasArbUsdc = items.some(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    if (!hasArbUsdc) {
      items.unshift({ ...ARB_USDC_TOKEN_ITEM, amount: 0 });
    }

    const hasHypeUsdc = items.some(
      (t) =>
        t.id === HYPE_USDC_TOKEN_ID && t.chain === HYPE_USDC_TOKEN_SERVER_CHAIN
    );
    if (!hasHypeUsdc) {
      const arbIdx = items.findIndex(
        (t) =>
          t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
      );
      items.splice(arbIdx + 1, 0, { ...HYPE_USDC_TOKEN_ITEM, amount: 0 });
    }
    items.sort((a, b) => b.amount * b.price - a.amount * a.price);

    return items;
  }, [list]);

  const handleClickToken = useMemoizedFn(async (token: TokenItem) => {
    if (clickLoading) return;
    try {
      if (isDirectDepositToken(token)) {
        // direct deposit (ARB USDC or HYPE USDC)
        onSelect(token);
        return;
      }

      setClickLoading(true);
      const res = await wallet.openapi.getPerpsBridgeIsSupportToken({
        token_id: token.id,
        chain_id: token.chain,
      });
      if (res?.success) {
        // bridge token with liFi dex
        onSelect(token);
        setClickLoading(false);
        return;
      } else {
        if (token.chain === ARB_USDC_TOKEN_SERVER_CHAIN) {
          // show modal go swap page
          const modal = Modal.confirm({
            width: 360,
            closable: false,
            maskClosable: true,
            centered: true,
            title: null,
            className: clsx(
              'perps-bridge-swap-modal',
              isDarkTheme
                ? 'perps-bridge-swap-modal-dark'
                : 'perps-bridge-swap-modal-light'
            ),
            content: (
              <>
                <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg">
                  <div className="flex items-center gap-[24px] h-[44px]">
                    <TokenWithChain
                      token={token}
                      hideConer
                      width="40px"
                      chainSize={20}
                      height="40px"
                    />
                    <RcIconArrow />
                    <TokenWithChain
                      token={ARB_USDC_TOKEN_ITEM}
                      hideConer
                      width="40px"
                      chainSize={20}
                      height="40px"
                    />
                  </div>
                  <div className="text-15 font-medium text-r-neutral-title-1 text-center">
                    {t('page.perps.depositAmountPopup.goSwapTips')}
                  </div>
                  <div className="flex items-center justify-center w-full gap-12 mt-20">
                    <Button
                      size="large"
                      block
                      type="primary"
                      onClick={async () => {
                        await changeAccount();
                        history.push(
                          `/dex-swap?rbisource=perps&payTokenId=${token.id}&chain=${token.chain}&receiveTokenId=${ARB_USDC_TOKEN_ID}`
                        );
                        modal.destroy();
                      }}
                    >
                      {t('page.swap.title')}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center w-full gap-12">
                    <PerpsBlueBorderedButton
                      block
                      onClick={() => {
                        modal.destroy();
                      }}
                    >
                      {t('page.manageAddress.cancel')}
                    </PerpsBlueBorderedButton>
                  </div>
                </div>
              </>
            ),
          });
        } else {
          const modal = Modal.info({
            width: 360,
            closable: false,
            maskClosable: true,
            centered: true,
            title: null,
            className: clsx(
              'perps-bridge-swap-modal',
              isDarkTheme
                ? 'perps-bridge-swap-modal-dark'
                : 'perps-bridge-swap-modal-light'
            ),
            content: (
              <>
                <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg">
                  <div className="flex items-center gap-[24px] h-[44px]">
                    <TokenWithChain
                      token={token}
                      hideConer
                      width="40px"
                      chainSize={20}
                      height="40px"
                    />
                    <RcIconArrow />
                    <TokenWithChain
                      token={ARB_USDC_TOKEN_ITEM}
                      hideConer
                      width="40px"
                      chainSize={20}
                      height="40px"
                    />
                  </div>
                  <div className="text-15 font-medium text-r-neutral-title-1 text-center">
                    {t('page.perps.depositAmountPopup.goBridgeTips')}
                  </div>
                  <div className="flex items-center justify-center w-full gap-12 mt-20">
                    <Button
                      size="large"
                      block
                      type="primary"
                      onClick={async () => {
                        await changeAccount();
                        history.push(
                          `/bridge?fromTokenId=${token.id}&fromChainServerId=${token.chain}&toTokenId=${ARB_USDC_TOKEN_ID}&toChainServerId=${ARB_USDC_TOKEN_SERVER_CHAIN}`
                        );
                        modal.destroy();
                      }}
                    >
                      {t('page.bridge.title')}
                    </Button>
                  </div>
                  <div className="flex items-center justify-center w-full gap-12">
                    <PerpsBlueBorderedButton
                      block
                      onClick={() => {
                        modal.destroy();
                      }}
                    >
                      {t('page.manageAddress.cancel')}
                    </PerpsBlueBorderedButton>
                  </div>
                </div>
              </>
            ),
          });
        }
      }
      setClickLoading(false);
    } catch (error) {
      console.error('deposit handleClickToken error', error);
    }
  });

  const Row = React.useCallback(
    ({
      index,
      data,
      style,
    }: {
      index: number;
      data: TokenItem[];
      style: CSSProperties;
    }) => {
      const item = data[index];

      return (
        <div
          key={item.id}
          style={style}
          className={clsx(
            'flex justify-between items-center cursor-pointer h-[56px] mb-8 border border-transparent',
            'bg-r-neutral-card1 rounded-[12px] p-16',
            'text-13 font-medium text-r-neutral-title-1',
            'hover:border-rabby-blue-default',
            'hover:bg-r-blue-light-1'
          )}
          onClick={(e) => handleClickToken(item)}
        >
          <div className="flex items-center gap-12">
            <TokenWithChain token={item} hideConer width="32px" height="32px" />
            <span className="text-15 text-r-neutral-title-1 font-medium">
              {getTokenSymbol(item)}
            </span>
            {isDirectDepositToken(item) && (
              <div className="flex items-center gap-4 text-[11px] font-medium text-r-blue-default bg-r-blue-light-1 rounded-[4px] px-6 py-2">
                <svg
                  width="8"
                  height="10"
                  viewBox="0 0 10 12"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M5.833 0 0 6.667h4.167L4.167 12 10 5.333H5.833z" />
                </svg>
                {t('page.perps.directDepositFast')}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <div className="text-15 text-r-neutral-title-1 font-medium">
              {formatUsdValue(
                isDirectDepositToken(item)
                  ? item.amount
                  : item.amount * item.price || 0
              )}
            </div>
            <div className="text-[12px] text-r-neutral-foot">
              {formatAmount(item.amount)}
            </div>
          </div>
        </div>
      );
    },
    [handleClickToken]
  );

  return (
    <Popup
      placement="bottom"
      width={'100%'}
      visible={visible}
      onClose={onCancel}
      onCancel={onCancel}
      getContainer={false}
      bodyStyle={{
        padding: 0,
      }}
      contentWrapperStyle={{
        boxShadow: '0px -12px 20px rgba(82, 86, 115, 0.1)',
        borderRadius: '16px 16px 0px 0',
        height: 500,
        overflow: 'hidden',
      }}
      closable
    >
      <div className="flex flex-col h-full pt-16 px-16 bg-r-neutral-bg2">
        <div className="px-16 text-20 font-medium text-r-neutral-title-1 text-center">
          {t('page.perps.selectTokenToDeposit')}
        </div>
        <div className="overflow-y-auto flex-1 relative mt-16">
          {tokenListLoading ? (
            <div className="flex flex-col items-center h-full w-full">
              {new Array(7).fill(null).map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center h-[48px] mb-8 border border-transparent bg-r-neutral-card1 rounded-[12px] p-16 w-full"
                >
                  <div className="flex items-center gap-12">
                    <Skeleton.Avatar active={true} size={24} shape="circle" />
                    <Skeleton.Button
                      active={true}
                      className="h-[16px] block rounded-[8px]"
                      style={{ width: 80 }}
                    />
                  </div>
                  <div className="flex flex-col gap-4 items-end">
                    <Skeleton.Button
                      active={true}
                      className="h-[16px] block rounded-[8px]"
                      style={{ width: 80 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <FixedSizeList
              width={'100%'}
              height={444}
              itemCount={sortedList?.length || 0}
              itemData={sortedList}
              itemSize={64}
            >
              {Row}
            </FixedSizeList>
          )}
        </div>
      </div>
    </Popup>
  );
};

export default TokenSelectPopup;
