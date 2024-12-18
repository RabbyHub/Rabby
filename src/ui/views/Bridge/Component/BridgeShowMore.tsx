import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Skeleton, Switch, Tooltip } from 'antd';
import clsx from 'clsx';
import React, {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useEffect,
  useMemo,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/bridge/tiny-down-arrow-cc.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { BridgeSlippage } from './BridgeSlippage';
import { tokenPriceImpact } from '../hooks';
import imgBestQuoteSharpBg from '@/ui/assets/swap/best-quote-sharp-bg.svg';
import styled from 'styled-components';

const dottedClassName =
  'h-0 flex-1 border-b-[1px] border-solid border-rabby-neutral-line opacity-50';

const PreferMEVGuardSwitch = styled(Switch)`
  min-width: 20px;
  height: 12px;

  &.ant-switch-checked {
    background-color: var(--r-blue-default, #7084ff);
    .ant-switch-handle {
      left: calc(100% - 10px - 1px);
      top: 1px;
    }
  }
  .ant-switch-handle {
    height: 10px;
    width: 10px;
    top: 1px;
    left: 1px;
  }
`;

export const BridgeShowMore = ({
  openQuotesList,
  sourceName,
  sourceLogo,
  slippage,
  displaySlippage,
  onSlippageChange,
  fromToken,
  toToken,
  amount,
  toAmount,
  quoteLoading,
  slippageError,
  autoSlippage,
  isCustomSlippage,
  setAutoSlippage,
  setIsCustomSlippage,
  open,
  setOpen,
  type,
  isWrapToken,
  isBestQuote,
  showMEVGuardedSwitch,
  originPreferMEVGuarded,
  switchPreferMEV,
  recommendValue,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  openQuotesList: () => void;
  sourceName: string;
  sourceLogo: string;
  slippage: string;
  displaySlippage: string;
  onSlippageChange: (n: string) => void;
  showLoss?: boolean;
  fromToken?: TokenItem;
  toToken?: TokenItem;
  amount?: string | number;
  toAmount?: string | number;
  quoteLoading?: boolean;
  slippageError?: boolean;
  autoSlippage: boolean;
  isCustomSlippage: boolean;
  setAutoSlippage: (boolean: boolean) => void;
  setIsCustomSlippage: (boolean: boolean) => void;
  type: 'swap' | 'bridge';
  /**
   * for swap props
   */
  isWrapToken?: boolean;
  isBestQuote: boolean;
  showMEVGuardedSwitch?: boolean;
  originPreferMEVGuarded?: boolean;
  switchPreferMEV?: (b: boolean) => void;
  recommendValue?: number;
}) => {
  const { t } = useTranslation();

  const data = useMemo(
    () => tokenPriceImpact(fromToken, toToken, amount, toAmount),
    [fromToken, toToken, amount, toAmount]
  );

  const bestQuoteStyle = useMemo(() => {
    if (isBestQuote) {
      return {
        backgroundImage: `url(${imgBestQuoteSharpBg})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '38px',
      };
    }
    return undefined;
  }, [isBestQuote]);

  useEffect(() => {
    if ((!quoteLoading && data?.showLoss) || slippageError) {
      setOpen(true);
    }
  }, [quoteLoading, data?.showLoss]);

  return (
    <div className="mx-16">
      <div className="flex items-center gap-8 mt-28 mb-8">
        <div className={clsx(dottedClassName)} />
        <div
          className={clsx(
            'flex items-center opacity-30',
            'cursor-pointer',
            'text-r-neutral-foot text-12'
          )}
          onClick={() => setOpen((e) => !e)}
        >
          <span>{t('page.bridge.showMore.title')}</span>
          <IconArrowDownCC
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className={clsx('transition-transform', open && 'rotate-180')}
          />
        </div>
        <div className={clsx(dottedClassName)} />
      </div>

      <div className={clsx('overflow-hidden', !open && 'h-0')}>
        {data?.showLoss && !quoteLoading && (
          <div className="leading-4 mb-12 text-12 text-r-neutral-foot">
            <div className="flex justify-between">
              <span>{t('page.bridge.price-impact')}</span>
              <span
                className={clsx(
                  'font-medium  inline-flex items-center',
                  'text-r-red-default'
                )}
              >
                -{data.diff}%
                <Tooltip
                  align={{
                    offset: [10, 0],
                  }}
                  placement={'topRight'}
                  overlayClassName="rectangle max-w-[360px]"
                  title={
                    <div className="flex flex-col gap-4 py-[5px] text-13">
                      <div>
                        {t('page.bridge.est-payment')} {amount}
                        {getTokenSymbol(fromToken)} ≈ {data.fromUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-receiving')} {toAmount}
                        {getTokenSymbol(toToken)} ≈ {data.toUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-difference')} {data.lossUsd}
                      </div>
                    </div>
                  }
                >
                  <RcIconInfo className="ml-4 text-rabby-neutral-foot w-14 h-14 " />
                </Tooltip>
              </span>
            </div>
            <div className="mt-[8px] rounded-[4px] border-[0.5px] border-rabby-red-default bg-r-red-light p-8 text-13 font-normal text-r-red-default">
              {t('page.bridge.loss-tips', {
                usd: data?.lossUsd,
              })}
            </div>
          </div>
        )}

        <ListItem name={t('page.bridge.showMore.source')} className="mb-12">
          {quoteLoading ? (
            <Skeleton.Input
              active
              className="rounded"
              style={{
                width: 52,
                height: 12,
              }}
            />
          ) : (
            <div
              className={clsx(
                'flex items-center gap-4 cursor-pointer',
                isBestQuote &&
                  'border-[0.5px] border-solid border-rabby-blue-default rounded-[4px] pr-[5px]'
              )}
              style={bestQuoteStyle}
              onClick={openQuotesList}
            >
              {isBestQuote ? (
                <span className="text-r-neutral-title2 text-[12px] font-medium italic py-1 pl-6 pr-8">
                  {t('page.swap.best')}
                </span>
              ) : null}
              {sourceLogo && (
                <img
                  className="w-12 h-12 rounded-full"
                  src={sourceLogo}
                  alt={sourceName}
                />
              )}
              <span className="text-rabby-blue-default font-medium">
                {sourceName}
              </span>
            </div>
          )}
        </ListItem>

        <BridgeSlippage
          value={slippage}
          displaySlippage={displaySlippage}
          onChange={onSlippageChange}
          autoSlippage={autoSlippage}
          isCustomSlippage={isCustomSlippage}
          setAutoSlippage={setAutoSlippage}
          setIsCustomSlippage={setIsCustomSlippage}
          type={type}
          isWrapToken={isWrapToken}
          recommendValue={recommendValue}
        />
        {showMEVGuardedSwitch && type === 'swap' ? (
          <ListItem
            name={
              <Tooltip
                placement={'topLeft'}
                overlayClassName={clsx('rectangle', 'max-w-[312px]')}
                title={t('page.swap.preferMEVTip')}
              >
                <span>{t('page.swap.preferMEV')}</span>
              </Tooltip>
            }
            className="mt-12"
          >
            <Tooltip
              placement={'topRight'}
              overlayClassName={clsx('rectangle', 'max-w-[312px]')}
              title={t('page.swap.preferMEVTip')}
            >
              <PreferMEVGuardSwitch
                checked={originPreferMEVGuarded}
                onChange={switchPreferMEV}
              />
            </Tooltip>
          </ListItem>
        ) : null}
      </div>
    </div>
  );
};

function ListItem({
  name,
  className,
  children,
}: PropsWithChildren<{ name: React.ReactNode; className?: string }>) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        'text-12 text-r-neutral-foot',
        className
      )}
    >
      <span>{name}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export const RecommendFromToken = ({
  token,
  className,
  onOk,
}: {
  token: TokenItem;
  className?: string;
  onOk: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center',
        'h-[44px] pl-12 pr-10 rounded-[8px]',
        'bg-r-neutral-card-1',
        className
      )}
    >
      <div
        className={clsx(
          'flex-1 flex items-center',
          'text-12 text-rabby-neutral-title-1'
        )}
      >
        <Trans t={t} i18nKey={'page.bridge.recommendFromToken'}>
          Bridge from
          <div
            className={clsx(
              'flex items-center gap-6',
              'px-8 py-6 mx-6',
              'text-r-blue-default',
              'bg-rabby-blue-light1 rounded-[6px]'
            )}
          >
            <TokenWithChain
              token={token}
              width="16px"
              height="16px"
              chainSize={'10px'}
            />
            <span>{getTokenSymbol(token)}</span>
          </div>
          for an available quote
        </Trans>
      </div>
      <Button
        type="primary"
        className="h-24 text-13 font-medium px-10 py-0"
        onClick={onOk}
      >
        {t('global.ok')}
      </Button>
    </div>
  );
};
