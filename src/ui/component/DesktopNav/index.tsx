import {
  RcIconHomeCC,
  RcIconHomeHover,
  RcIconHomeInActive,
  RcIconLeadingCC,
  RcIconPerpsCC,
  RcIconPredictionCC,
} from '@/ui/assets/desktop/nav';
import { splitNumberByStep } from '@/ui/utils';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  RcIconBridgeCC,
  RcIconQueueCC,
  RcIconSendCC,
  RcIconSwapCC,
} from '@/ui/assets/desktop/profile';
import { useHistory } from 'react-router-dom';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { KEYRING_TYPE } from '@/constant';

type DesktopNavAction = 'swap' | 'send' | 'bridge' | 'gnosis-queue';

export const DesktopNav: React.FC<{
  balance?: number | null;
  changePercent?: string | null;
  isLoss?: boolean;
  isLoading?: boolean;
  onActionSelect?: (action: DesktopNavAction) => void;
  showRightItems?: boolean;
}> = ({
  balance,
  changePercent,
  isLoss,
  isLoading,
  onActionSelect,
  showRightItems = true,
}) => {
  const { t } = useTranslation();
  const history = useHistory();
  const currentAccount = useCurrentAccount();

  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;

  const currentPathname = history.location.pathname;

  const handleActionClick = useCallback(
    (nextAction: DesktopNavAction) => {
      if (onActionSelect) {
        onActionSelect(nextAction);
        return;
      }
      history.replace(`${currentPathname}?action=${nextAction}`);
    },
    [history, onActionSelect]
  );

  const items = useMemo(
    () =>
      showRightItems
        ? [
            {
              key: 'swap',
              title: t('page.desktopProfile.button.swap'),
              Icon: RcIconSwapCC,
              onClick: () => handleActionClick('swap'),
            },
            {
              key: 'send',
              title: t('page.desktopProfile.button.send'),
              Icon: RcIconSendCC,
              onClick: () => handleActionClick('send'),
            },
            {
              key: 'bridge',
              title: t('page.desktopProfile.button.bridge'),
              Icon: RcIconBridgeCC,
              onClick: () => handleActionClick('bridge'),
            },
          ]
        : [],
    [handleActionClick, t, showRightItems]
  );

  return (
    <div className="flex items-center justify-between">
      <div className="flex">
        <div
          className={clsx(
            'flex items-center gap-[12px] rounded-[20px] px-[12px] py-[6px]',
            'border-[1px] border-solid border-rb-neutral-bg-2',
            'bg-rb-neutral-bg-3'
          )}
        >
          <div
            className={clsx(
              'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
              currentPathname === '/desktop/profile'
                ? 'text-r-neutral-title2'
                : 'text-rb-neutral-foot hover:bg-rb-brand-light-1 group'
            )}
            style={
              currentPathname === '/desktop/profile'
                ? {
                    background:
                      'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
                  }
                : undefined
            }
            onClick={() => {
              if (currentPathname !== '/desktop/profile') {
                history.push('/desktop/profile');
              }
            }}
          >
            {currentPathname === '/desktop/profile' ? (
              <RcIconHomeCC className="flex-shrink-0" />
            ) : (
              <>
                {/* <RcIconHomeCC className="flex-shrink-0 " /> */}

                <RcIconHomeHover className="flex-shrink-0 hidden group-hover:block text-rb-neutral-InvertHighlight" />
                <RcIconHomeInActive className="text-rb-neutral-secondary group-hover:hidden" />
              </>
            )}
            <div
              className={clsx(
                'min-w-0',
                currentPathname !== '/desktop/profile' &&
                  'group-hover:text-rb-brand-default'
              )}
            >
              <div className="text-[16px] leading-[19px] font-bold">
                {t('component.DesktopNav.portfolio')}
              </div>
              {currentPathname === '/desktop/profile' ? (
                isLoading ? (
                  <Skeleton.Input
                    className="w-[96px] h-[14px] rounded-[2px] block"
                    active
                  />
                ) : (
                  <div className="text-[12px] leading-[14px] flex items-center gap-[4px]">
                    <div className="truncate">
                      ${splitNumberByStep((balance || 0).toFixed(2))}
                    </div>
                    {changePercent ? (
                      <span
                        className={clsx(
                          isLoss ? 'text-r-red-default' : 'text-[#17FFAA]'
                        )}
                      >
                        {isLoss ? '-' : '+'}
                        {changePercent}
                      </span>
                    ) : null}
                  </div>
                )
              ) : null}
            </div>
          </div>
          <div
            className={clsx(
              'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
              currentPathname === '/desktop/perps'
                ? 'text-r-neutral-title2'
                : 'text-rb-neutral-foot hover:bg-rb-brand-light-1 group'
            )}
            style={
              currentPathname === '/desktop/perps'
                ? {
                    background:
                      'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
                  }
                : undefined
            }
            onClick={() => {
              if (currentPathname !== '/desktop/perps') {
                history.push('/desktop/perps');
              }
            }}
          >
            <RcIconPerpsCC
              className={clsx(
                currentPathname === '/desktop/perps'
                  ? 'text-rb-neutral-InvertHighlight'
                  : 'text-rb-neutral-secondary group-hover:text-rb-brand-default'
              )}
            />
            <div>
              <div
                className={clsx(
                  currentPathname === '/desktop/perps'
                    ? ''
                    : 'text-rb-neutral-foot group-hover:text-rb-brand-default',

                  'text-[16px] leading-[19px] font-bold'
                )}
              >
                {t('component.DesktopNav.perps')}
              </div>
            </div>
          </div>
          {/* <div
            className={clsx(
              'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer'
            )}
          >
            <RcIconLeadingCC className="text-rb-neutral-secondary" />
            <div>
              <div className="text-rb-neutral-foot text-[16px] leading-[19px] font-bold">
                {t('component.DesktopNav.lending')}
              </div>
              <div className="text-rb-neutral-secondary text-[12px] leading-[14px]">
                {t('component.DesktopNav.comingSoon')}
              </div>
            </div>
          </div> */}

          <div
            className={clsx(
              'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
              currentPathname === '/desktop/dapp-iframe'
                ? 'text-r-neutral-title2'
                : 'text-rb-neutral-foot hover:bg-rb-brand-light-1 group'
            )}
            style={
              currentPathname === '/desktop/dapp-iframe'
                ? {
                    background:
                      'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
                  }
                : undefined
            }
            onClick={() => {
              // if (currentPathname !== '/desktop/dapp-iframe') {
              //   history.push('/desktop/dapp-iframe');
              // }
            }}
          >
            <RcIconPredictionCC
              className={clsx(
                currentPathname === '/desktop/dapp-iframe'
                  ? 'text-rb-neutral-InvertHighlight'
                  : 'text-rb-neutral-secondary group-hover:text-rb-brand-default'
              )}
            />
            <div>
              <div
                className={clsx(
                  currentPathname === '/desktop/dapp-iframe'
                    ? ''
                    : 'text-rb-neutral-foot group-hover:text-rb-brand-default',

                  'text-[16px] leading-[19px] font-bold'
                )}
              >
                {t('component.DesktopNav.prediction')}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-[12px]">
        {items?.map(({ key, title, Icon, onClick }) => (
          <div
            key={key}
            className={clsx(
              'min-w-[100px] p-[14px] rounded-[14px]',
              'flex items-center justify-center gap-[8px] cursor-pointer',
              'text-rb-brand-default text-[14px]  font-semibold',
              'border border-rb-brand-light-1'
            )}
            style={{
              background: 'rgba(var(--rb-brand-default-rgb),0.08)',
            }}
            onClick={onClick}
          >
            <Icon />
            {title}
          </div>
        ))}
        {isGnosis ? (
          <div
            className={clsx(
              'min-w-[100px] p-[14px] rounded-[14px]',
              'flex items-center justify-center gap-[8px] cursor-pointer',
              'text-rb-brand-default text-[14px] leading-[17px] font-semibold',
              'border-[0.5px] border-solid border-rb-brand-default'
            )}
            onClick={() => handleActionClick('gnosis-queue')}
          >
            <RcIconQueueCC />
            {t('page.desktopProfile.button.queue')}
          </div>
        ) : null}
      </div>
    </div>
  );
};
