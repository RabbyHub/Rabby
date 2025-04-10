import { getTokenSymbol } from '@/ui/utils/token';
import { TokenItemWithEntity } from '@rabby-wallet/rabby-api/dist/types';
import React, { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import TokenWithChain, { IconWithChain } from '../TokenWithChain';
import { formatPrice, formatUsdValue } from '@/ui/utils';
import { ReactComponent as RcIconDanger } from '@/ui/assets/search/RcIconDanger.svg';
import { ReactComponent as RcIconWarning } from '@/ui/assets/search/RcIconWarning.svg';
import { ReactComponent as IconBridgeTo } from '@/ui/assets/search/IconBridgeTo.svg';
import { ReactComponent as IconOrigin } from '@/ui/assets/search/IconOrigin.svg';
import { Divider } from 'antd';
import clsx from 'clsx';
import styled from 'styled-components';
import { TooltipWithMagnetArrow } from '../Tooltip/TooltipWithMagnetArrow';

const TokenSymbolWrapper = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-style: normal;
  font-weight: 510;
  line-height: normal;
  color: var(--r-neutral-body, #3e495e);
  margin-left: 10px;
  max-width: 100%;
  padding: 2px 4px;
  border-radius: 4px;
  width: min-content;
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  text-decoration-style: solid;
  text-decoration-skip-ink: none;
  text-decoration-thickness: auto;
  text-underline-offset: auto;
  text-underline-position: from-font;

  &:hover {
    background: var(--r-blue-light2, #dee3fc);
    color: var(--r-blue-default, #7084ff);
    text-decoration-line: underline;
  }
`;

const SymbolClickable = ({
  token,
  className,
  groupHover = true,
  onClick,
}: {
  token: TokenItemWithEntity;
  className?: string;
  groupHover?: boolean;
  onClick?: () => void;
}) => {
  const title = useMemo(() => {
    return getTokenSymbol(token);
  }, [token]);
  return (
    <TokenSymbolWrapper
      className={clsx(
        groupHover &&
          'group-hover:text-rabby-blue-default group-hover:underline',
        className
      )}
      onClick={onClick}
    >
      {title}
    </TokenSymbolWrapper>
  );
};

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
      if (data.is_verified === false) {
        return <RiskTokenTips isDanger={true} />;
      }

      if (data.is_scam) {
        return <RiskTokenTips isDanger={false} />;
      }

      if (data.identity?.domain_id) {
        const isBridgeDomain = data.identity.bridge_ids?.length > 0;
        const isVerified = data.identity.is_domain_verified;

        return (
          <div
            className={clsx(
              'flex justify-between items-center mt-10',
              'px-8 py-6 mx-16 rounded-[6px]',
              'border-[0.5px] border-solid border-rabby-neutral-line',
              'text-12 font-medium text-r-neutral-foot'
            )}
          >
            <span>{t('page.search.tokenItem.Issuedby')}</span>
            <div className="flex items-center gap-4">
              {isVerified &&
                (isBridgeDomain ? <IconBridgeTo /> : <IconOrigin />)}
              <span className="text-neutral-title-1">
                {data.identity?.domain_id}
              </span>
            </div>
          </div>
        );
      }

      return null;
    }, [data.identity, t]);

    const siteList = useMemo(() => {
      return [
        ...(data?.identity?.listed_sites || []),
        ...(data?.identity?.cex_list || []),
      ];
    }, [data]);

    return (
      <div
        className={clsx(
          'token-list__item h-auto py-[15px] cursor-pointer',
          disabled && 'token-disabled'
        )}
        onClick={onPressToken}
      >
        <li className="w-full">
          <div className="w-[220px]">
            <TokenWithChain token={data} width="32px" height="32px" hideConer />
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="symbol_click" onClick={onClickTokenSymbol}>
                  {getTokenSymbol(data)}
                </span>
                <Divider type="vertical" />
                <div className="flex items-center gap-4 relative">
                  {siteList.slice(0, 5).map((item, idx) => (
                    <TooltipWithMagnetArrow
                      key={item.name}
                      title={t('page.search.tokenItem.listBy', {
                        name: item.name,
                      })}
                      trigger={['hover']}
                      overlayClassName="rectangle w-[max-content]"
                    >
                      <div>
                        <IconWithChain
                          iconUrl={item.logo_url}
                          width={'12px'}
                          height={'12px'}
                          hideChainIcon
                          chainServerId={data.chain}
                        />
                      </div>
                    </TooltipWithMagnetArrow>
                  ))}

                  {siteList.length > 5 ? (
                    <TooltipWithMagnetArrow
                      title={t('page.search.tokenItem.listBy', {
                        name: siteList
                          .slice(5)
                          .map((e) => e.name)
                          .join(','),
                      })}
                      trigger={['hover']}
                      overlayClassName="rectangle w-[max-content]"
                    >
                      <span className="text-r-neutral-foot text-[11px] font-medium whitespace-nowrap">
                        + {siteList.length - 5}
                      </span>
                    </TooltipWithMagnetArrow>
                  ) : null}
                </div>
              </div>
              {isGasToken ? (
                <span className="symbol text-13 ml-[6px]">
                  <span className="bg-r-blue-light2 py-2 px-6 rounded text-[11px] font-medium text-r-blue-default w-auto inline-block">
                    {t('page.search.tokenItem.gasToken')}
                  </span>
                </span>
              ) : (
                <span className="symbol text-13 font-normal text-r-neutral-foot">
                  {t('page.search.tokenItem.FDV')}{' '}
                  {data.identity?.fdv
                    ? formatUsdValue(data.identity?.fdv)
                    : '-'}
                </span>
              )}
            </div>
          </div>

          <div className="w-0" />

          <div className="flex flex-col text-right items-end">
            <span className="token_usd_value">
              {decimalPrecision ? '$' : ''}
              {(decimalPrecision ? formatPrice : formatUsdValue)(
                data.price || 0
              )}
            </span>
            <span className={clsx('text-sm text-13 font-normal', percentColor)}>
              {formatPercentage(data.price_24h_change || 0)}
            </span>
          </div>
        </li>

        {ExtraContent}
      </div>
    );
  }
);

export const RiskTokenTips = ({ isDanger }: { isDanger?: boolean }) => {
  const { t } = useTranslation();

  const Icon = isDanger ? RcIconDanger : RcIconWarning;
  const tip = isDanger
    ? t('page.search.tokenItem.verifyDangerTips')
    : t('page.search.tokenItem.scamWarningTips');

  return (
    <div
      className={clsx(
        'flex justify-center items-center gap-2 ',
        'mt-10 py-6 mx-16 rounded-[6px]',
        'text-12 font-medium',
        isDanger
          ? 'text-r-red-default bg-r-red-light'
          : 'text-r-orange-default bg-r-orange-light'
      )}
    >
      <Icon className="w-12 h-12" viewBox="0 0 14 14" />
      <span className="text-sm font-medium">{tip}</span>
    </div>
  );
};

export { ExternalTokenRow };
