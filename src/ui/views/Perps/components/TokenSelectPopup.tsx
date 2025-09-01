import React, { CSSProperties } from 'react';
import { message, Modal, Spin } from 'antd';
import Popup, { PopupProps } from '@/ui/component/Popup';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useAsync } from 'react-use';
import { Button, Space, Tooltip } from 'antd';
import clsx from 'clsx';
import { ReactComponent as RcIconArrow } from 'ui/assets/perps/IconArrow.svg';
import { batchQueryTokens } from '@/ui/utils/portfolio/tokenUtils';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_ITEM,
  ARB_USDC_TOKEN_SERVER_CHAIN,
} from '../constants';
import { useMemoizedFn } from 'ahooks';
import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { FixedSizeList } from 'react-window';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { PerpsBlueBorderedButton } from './BlueBorderedButton';
import { useThemeMode } from '@/ui/hooks/usePreference';

export type TokenSelectPopupProps = PopupProps & {
  onSelect: (token: TokenItem) => void;
  list: TokenItem[];
  usdcTokenInfo: TokenItem | null | undefined;
  changeAccount: () => Promise<void>;
};

export const TokenSelectPopup: React.FC<TokenSelectPopupProps> = ({
  visible,
  onCancel,
  onSelect,
  list,
  usdcTokenInfo,
  changeAccount,
  ...rest
}) => {
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const history = useHistory();
  const wallet = useWallet();

  const sortedList = React.useMemo(() => {
    const items = [...(list || [])];
    items.sort((a, b) => b.amount * b.price - a.amount * a.price);
    const idx = items.findIndex(
      (t) =>
        t.id === ARB_USDC_TOKEN_ID && t.chain === ARB_USDC_TOKEN_SERVER_CHAIN
    );
    if (idx > 0) {
      const [hit] = items.splice(idx, 1);
      items.unshift(hit);
    } else if (idx === -1) {
      items.unshift(ARB_USDC_TOKEN_ITEM);
    }
    return items;
  }, [list]);

  const handleClickToken = useMemoizedFn((token: TokenItem) => {
    if (
      token.chain === ARB_USDC_TOKEN_SERVER_CHAIN &&
      token.id !== ARB_USDC_TOKEN_ID
    ) {
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
              <div className="flex items-center gap-[24px]">
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
      return;
    }

    if (token.chain !== ARB_USDC_TOKEN_SERVER_CHAIN) {
      // show modal go bridge page
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
              <div className="flex items-center gap-[24px]">
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
      return;
    }

    onSelect(token);
    onCancel?.();
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
            'flex justify-between items-center cursor-pointer h-[48px] mb-8 border border-transparent',
            'bg-r-neutral-card1 rounded-[12px] p-16',
            'text-13 font-medium text-r-neutral-title-1',
            'hover:border-rabby-blue-default',
            'hover:bg-r-blue-light-1'
          )}
          onClick={(e) => handleClickToken(item)}
        >
          <div className="flex items-center gap-12">
            <TokenWithChain token={item} hideConer width="24px" height="24px" />
            <span className="text-13 text-r-neutral-title-1 font-medium">
              {getTokenSymbol(item)}
            </span>
            {item.id === ARB_USDC_TOKEN_ID &&
              item.chain === ARB_USDC_TOKEN_SERVER_CHAIN && (
                <div className="text-13 font-medium text-r-blue-default bg-r-blue-light-1 rounded-[4px] px-8 py-4">
                  {t('page.perps.directDeposit')}
                </div>
              )}
          </div>
          <div className="text-13 text-r-neutral-title-1 font-medium">
            {item.id === ARB_USDC_TOKEN_ID && usdcTokenInfo?.amount
              ? formatUsdValue(
                  usdcTokenInfo?.amount * usdcTokenInfo?.price || 0
                )
              : formatUsdValue(item.amount * item.price || 0)}
          </div>
        </div>
      );
    },
    [handleClickToken, usdcTokenInfo]
  );

  return (
    <Popup
      placement="right"
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
          <FixedSizeList
            width={'100%'}
            height={444}
            itemCount={sortedList?.length || 0}
            itemData={sortedList}
            itemSize={56}
          >
            {Row}
          </FixedSizeList>
        </div>
      </div>
    </Popup>
  );
};

export default TokenSelectPopup;
