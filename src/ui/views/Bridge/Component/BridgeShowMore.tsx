import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol } from '@/ui/utils/token';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { PropsWithChildren, ReactNode, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/bridge/tiny-down-arrow-cc.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { BridgeSlippage } from './BridgeSlippage';
import { tokenPriceImpact } from '../hooks';

const dottedClassName =
  'h-0 flex-1 border-b-[1px] border-solid border-rabby-neutral-line';

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
}: {
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
}) => {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  const data = useMemo(
    () => tokenPriceImpact(fromToken, toToken, amount, toAmount),
    [fromToken, toToken, amount, toAmount]
  );

  return (
    <div>
      <div className="flex items-center gap-8 mt-28 mb-8 op">
        <div className={clsx(dottedClassName)} />
        <div
          className={clsx(
            'flex items-center opacity-30',
            'cursor-pointer',
            'text-r-neutral-foot text-12'
          )}
          onClick={() => setShow((e) => !e)}
        >
          <span>{t('page.bridge.showMore.title')}</span>
          <IconArrowDownCC
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className={clsx('transition-transform', show && 'rotate-180')}
          />
        </div>
        <div className={clsx(dottedClassName)} />
      </div>

      <div className={clsx('px-16', 'overflow-hidden', !show && 'h-0')}>
        {data?.showLoss && (
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
                usd: data?.diff,
              })}
            </div>
          </div>
        )}

        <ListItem name={t('page.bridge.showMore.source')} className="mb-8">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={openQuotesList}
          >
            {sourceLogo && (
              <img
                className="w-12 h-12 rounded-full"
                src={sourceLogo}
                alt={sourceName}
              />
            )}
            <span className="text-rabby-blue-default">{sourceName}</span>
          </div>
        </ListItem>

        <BridgeSlippage
          value={slippage}
          displaySlippage={displaySlippage}
          onChange={onSlippageChange}
        />
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
}: {
  token: TokenItem;
  className?: string;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center',
        'h-[40px] px-8 rounded-[8px]',
        'bg-r-neutral-card-1',
        className
      )}
    >
      <div
        className={clsx(
          'flex-1 flex items-center',
          'text-13 text-rabby-neutral-title-1'
        )}
      >
        <Trans t={t} i18nKey={'page.bridge.recommendFromToken'}>
          Bridge from
          <div className="flex items-center gap-6 mx-2">
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
      <Button type="primary" className="h-24 text-13 font-medium px-10 py-0">
        {t('global.ok')}
      </Button>
    </div>
  );
};
