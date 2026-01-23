import {
  RcIconHomeCC,
  RcIconHomeHover,
  RcIconHomeInActive,
  RcIconLeadingCC,
  RcIconPerpsCC,
  RcIconPredictionCC,
} from '@/ui/assets/desktop/nav';
import { splitNumberByStep } from '@/ui/utils';
import { Skeleton, Tooltip } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo } from 'react';
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
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import { debounce } from 'lodash';

type DesktopNavAction = 'swap' | 'send' | 'bridge' | 'gnosis-queue';

export const DESKTOP_NAV_HEIGHT = 84;

const reportNavEvent = debounce((eventKey: string) => {
  matomoRequestEvent({
    category: 'RabbyWeb_Active',
    action: `RabbyWeb_${eventKey}`,
  });

  ga4.fireEvent('RabbyWeb_Active', {
    event_category: `RabbyWeb_${eventKey}`,
  });
}, 300);

export const DesktopNav: React.FC<{
  onActionSelect?: (action: DesktopNavAction) => void;
  showRightItems?: boolean;
}> = ({ onActionSelect, showRightItems = true }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const currentAccount = useCurrentAccount();

  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;

  const currentPathname = history.location.pathname;

  const navs = useMemo(
    () => [
      {
        key: '/desktop/profile',
        icon: RcIconHomeCC,
        title: t('component.DesktopNav.portfolio'),
        eventKey: 'Portfolio',
      },
      {
        key: '/desktop/perps',
        icon: RcIconPerpsCC,
        title: t('component.DesktopNav.perps'),
        eventKey: 'Perps',
      },
      {
        key: '/desktop/dapp-iframe',
        icon: RcIconPredictionCC,
        title: t('component.DesktopNav.prediction'),
        eventKey: 'Prediction',
      },
      {
        key: '/desktop/lending',
        icon: RcIconLeadingCC,
        title: t('component.DesktopNav.lending'),
        isSoon: true,
        eventKey: 'Lending',
      },
    ],
    [t]
  );

  const activeNav = useMemo(
    () => navs.find((item) => currentPathname.startsWith(item.key)),
    [navs, currentPathname]
  );

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

  useEffect(() => {
    if (!activeNav?.eventKey) {
      return;
    }
    reportNavEvent(activeNav.eventKey);
  }, [activeNav?.eventKey]);

  return (
    <div className="sticky top-0 z-10 pt-[20px] pb-[16px] bg-rb-neutral-bg-1">
      <div className="flex items-center justify-between">
        <div className="flex">
          <div
            className={clsx(
              'flex items-center rounded-[20px] p-[3px]',
              'border-[1px] border-solid border-rb-neutral-line'
              // 'bg-rb-neutral-bg-3'
            )}
          >
            {navs.map((item) => {
              const Icon = item.icon;
              const isActive = currentPathname.startsWith(item.key);

              const isLending = item.key === '/desktop/lending';

              return (
                <Tooltip
                  key={item.key}
                  overlayClassName="rectangle"
                  placement="bottom"
                  title={
                    item.isSoon
                      ? t('component.DesktopNav.comingSoon')
                      : undefined
                  }
                >
                  <div
                    className={clsx(
                      'flex items-center justify-center gap-[8px] min-w-[152px] h-[40px] ',
                      'rounded-[16px]',
                      isActive
                        ? 'text-r-blue-default  bg-rb-brand-light-1'
                        : 'text-rb-neutral-foot',
                      item.isSoon
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:bg-rb-neutral-bg-2 cursor-pointer'
                    )}
                    onClick={() => {
                      if (item.isSoon) {
                        return;
                      }
                      history.push(item.key);
                    }}
                  >
                    <Icon
                      className={clsx(
                        isLending ? 'w-[32px] h-[32px]' : 'w-[28px] h-[28px]'
                      )}
                    />
                    <div className="space-y-[1px]">
                      <div className="text-[16px] leading-[19px] font-bold">
                        {item.title}
                      </div>
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-[12px]">
          {items?.map(({ key, title, Icon, onClick }) => (
            <div
              key={key}
              className={clsx(
                'min-w-[88px] p-[12px] rounded-[14px]',
                'flex items-center justify-center gap-[4px] cursor-pointer',
                'text-rb-brand-default text-[14px] leading-[16px] font-medium',
                'bg-rb-brand-light-1 hover:bg-rb-brand-light-2'
              )}
              onClick={onClick}
            >
              <Icon />
              {title}
            </div>
          ))}
          {isGnosis ? (
            <div
              className={clsx(
                'min-w-[88px] p-[12px] rounded-[14px]',
                'flex items-center justify-center gap-[4px] cursor-pointer',
                'text-rb-brand-default text-[14px] leading-[16px] font-medium',
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
    </div>
  );
};
