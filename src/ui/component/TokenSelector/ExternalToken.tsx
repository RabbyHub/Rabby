import { getTokenSymbol } from '@/ui/utils/token';
import { TokenItemWithEntity } from '@rabby-wallet/rabby-api/dist/types';
import React, { memo, SVGProps, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TokenWithChain from '../TokenWithChain';
import { formatPrice, formatTokenAmount, formatUsdValue } from '@/ui/utils';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { ellipsisAddress } from '@/ui/utils/address';
import { ExchangeLogos } from './CexLogos';
import { isLpToken } from '@/ui/utils/portfolio/lpToken';
import { LpTokenTag } from '@/ui/views/DesktopProfile/components/TokensTabPane/components/LpTokenTag';
import { getCexIds } from '@/ui/utils/portfolio/tokenUtils';

const formatPercentage = (x: number) => {
  if (Math.abs(x) < 0.00001) {
    return '0%';
  }
  const percentage = (x * 100).toFixed(2);
  return `${x >= 0 ? '+' : ''}${percentage}%`;
};

const ExternalTokenRow = memo(
  ({
    data,
    onTokenPress,
    decimalPrecision = false,
    className,
    disabled,
    onClickTokenSymbol,
  }: {
    data: TokenItemWithEntity;
    onTokenPress?(token: TokenItemWithEntity): void;
    decimalPrecision?: boolean;
    className?: string;
    disabled?: boolean;
    onClickTokenSymbol?: React.MouseEventHandler<HTMLSpanElement>;
  }) => {
    const { t } = useTranslation();

    const isGasToken = useMemo(() => data.id === data.chain, [data]);

    const onPressToken = useCallback(() => {
      return onTokenPress?.(data);
    }, [data, onTokenPress]);

    const percentColor = useMemo(() => {
      if (
        !data?.price_24h_change ||
        Math.abs(data.price_24h_change) < 0.00001
      ) {
        return 'text-r-neutral-body';
      }
      return data.price_24h_change > 0
        ? 'text-r-green-default'
        : 'text-r-red-default';
    }, [data.price_24h_change]);

    const ExtraContent = useMemo(() => {
      const isDanger = data.is_verified === false;
      const isWarning = data.is_suspicious;

      return (
        <div
          className={clsx(
            'flex justify-between items-center mt-10 relative',
            'px-8 py-6 mx-16 rounded-[6px]',
            'border-[0.5px] border-solid border-transparent',
            'text-12 font-medium text-r-neutral-foot'
          )}
        >
          {isGasToken ? (
            <span
              className={`bg-r-blue-light2 text-r-blue-default 
                items-center justify-center inline-block
                text-[12px] leading-[16px] font-medium
                h-[16px] px-6 rounded  w-auto`}
            >
              {t('page.search.tokenItem.gasToken')}
            </span>
          ) : (
            <span className="symbol text-13 font-normal text-r-neutral-foot mb-2">
              {t('page.search.tokenItem.FDV')}{' '}
              {data.identity?.fdv ? formatUsdValue(data.identity?.fdv) : '-'}
              <span className="text-r-neutral-line text-13 font-normal">
                {' '}
                |{' '}
              </span>
              CA:{' '}
              {ellipsisAddress(
                (data as TokenItemWithEntity)?.identity?.token_id || data.id
              )}
            </span>
          )}
          <div
            className={clsx(
              'flex items-center gap-2',
              isDanger
                ? 'text-r-red-default'
                : isWarning
                ? 'text-r-orange-default'
                : 'text-r-neutral-body'
            )}
          >
            {(isDanger || isWarning) && (
              <RcIconWarningCC className="w-12 h-12" viewBox="0 0 16 16" />
            )}
            <RcIconArrowRight className="w-12 h-12" viewBox="0 0 20 20" />
          </div>
          <BoxWrapper className="absolute bottom-0 left-0 w-full" />
        </div>
      );
    }, [data, isGasToken, t]);

    const cexIds = useMemo(() => {
      return getCexIds(data);
    }, [data]);

    return (
      <div
        className={clsx(
          'token-list__item h-auto py-[15px] cursor-pointer',
          disabled && 'token-disabled'
        )}
        onClick={onPressToken}
      >
        <li className="w-full flex flex-row swap-to">
          <div className="w-[220px]">
            <TokenWithChain token={data} width="32px" height="32px" hideConer />
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="symbol_click" onClick={onClickTokenSymbol}>
                  {getTokenSymbol(data)}
                </span>
                {isLpToken(data) && (
                  <LpTokenTag
                    size={14}
                    inModal
                    iconClassName="text-r-neutral-foot"
                    protocolName={data.protocol_id || ''}
                  />
                )}
                <ExchangeLogos cexIds={cexIds} />
              </div>
              <span className="symbol text-13 font-normal text-r-neutral-foot mb-2">
                {formatTokenAmount(data.amount || 0)} {data.symbol}
              </span>
            </div>
          </div>

          <div className="w-0" />

          <div className="flex flex-col text-right items-end">
            <span className="token_usd_value">
              {formatUsdValue(
                new BigNumber(data.price || 0).times(data.amount || 0).toFixed()
              )}
            </span>
            <span className="flex items-center gap-4">
              <span className="text-r-neutral-foot text-13 font-normal">
                @{decimalPrecision ? '$' : ''}
                {(decimalPrecision ? formatPrice : formatUsdValue)(
                  data.price || 0
                )}
              </span>
              <span
                className={clsx('text-sm text-13 font-medium', percentColor)}
              >
                {formatPercentage(data.price_24h_change || 0)}
              </span>
            </span>
          </div>
        </li>

        {ExtraContent}
      </div>
    );
  }
);

const BoxWrapper = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="330"
      height="34"
      viewBox="0 0 330 34"
      fill="none"
      {...props}
    >
      <path
        d="M16.6651 1.26647L13 6.82609H7C3.68629 6.82609 1 9.51238 1 12.8261V27C1 30.3137 3.68629 33 6.99999 33H323C326.314 33 329 30.3137 329 27V12.8261C329 9.51238 326.314 6.82609 323 6.82609H22L18.3349 1.26647C17.9397 0.667001 17.0603 0.667001 16.6651 1.26647Z"
        stroke="var(--r-neutral-line)"
        stroke-width="0.5"
      />
    </svg>
  );
};

export const RiskTokenTips = ({
  isDanger,
  onPress,
}: {
  isDanger?: boolean;
  onPress?: React.MouseEventHandler<HTMLDivElement>;
}) => {
  const { t } = useTranslation();

  const tip = isDanger
    ? t('page.search.tokenItem.verifyDangerTips')
    : t('page.search.tokenItem.scamWarningTips');

  return (
    <div
      className={clsx(
        'flex justify-between items-center relative',
        'mt-10 py-6 mx-16 rounded-[6px]',
        'text-12 font-medium',
        isDanger
          ? 'text-r-red-default bg-r-red-light'
          : 'text-r-orange-default bg-r-orange-light'
      )}
      onClick={onPress}
    >
      <div className="flex items-center gap-2 ml-8">
        <RcIconWarningCC className="w-12 h-12" viewBox="0 0 16 16" />
        <span className="text-12">{tip}</span>
      </div>
      <RcIconArrowRight className="w-12 h-12 mr-8" viewBox="0 0 20 20" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="10"
        viewBox="0 0 13 10"
        fill="none"
        className="absolute top-[-8px] left-[10px]"
      >
        <path
          d="M1.07057 8.43532L5.97265 1.27075C6.38142 0.673304 7.26988 0.694675 7.64946 1.31108L12.0613 8.47565C12.4716 9.14191 11.9923 10 11.2098 10H1.89588C1.09172 10 0.616476 9.099 1.07057 8.43532Z"
          fill={
            isDanger
              ? 'var(--r-red-light, #fff2f0)'
              : 'var(--r-orange-light, #fff5e2)'
          }
        />
      </svg>
    </div>
  );
};

export { ExternalTokenRow };
