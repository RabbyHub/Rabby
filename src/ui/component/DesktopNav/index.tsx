import {
  RcIconHomeCC,
  RcIconLeadingCC,
  RcIconPerpsCC,
} from '@/ui/assets/desktop/nav';
import { splitNumberByStep } from '@/ui/utils';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';

export const DesktopNav: React.FC<{
  balance?: number | null;
  changePercent?: string | null;
  isLoss?: boolean;
  isLoading?: boolean;
}> = ({ balance, changePercent, isLoss, isLoading }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isActive = (tab: string) => location.pathname.includes(tab);
  const history = useHistory();
  return (
    <div className="flex">
      <div
        className={clsx(
          'flex items-center gap-[12px] rounded-[20px] px-[12px] py-[10px]',
          'border-[1px] border-solid border-rb-neutral-bg-2',
          'bg-rb-neutral-bg-3'
        )}
      >
        <div
          className={clsx(
            'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
            isActive('profile')
              ? 'text-r-neutral-title2'
              : 'text-rb-neutral-foot'
          )}
          style={
            isActive('profile')
              ? {
                  background:
                    'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
                }
              : {}
          }
          onClick={() => {
            history.push('/desktop/profile/');
          }}
        >
          <RcIconHomeCC
            className={clsx(
              'flex-shrink-0',
              isActive('profile')
                ? 'text-r-neutral-title2'
                : 'text-rb-neutral-secondary'
            )}
          />
          <div className="min-w-0">
            <div className="text-[16px] leading-[19px] font-bold">
              {t('component.DesktopNav.portfolio')}
            </div>
            {isLoading ? (
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
            )}
          </div>
        </div>
        <div
          style={
            isActive('perps')
              ? {
                  background:
                    'linear-gradient(267deg, #5A71FF 1.05%, #384ABA 98.9%)',
                }
              : {}
          }
          onClick={() => {
            history.push('/desktop/perps');
          }}
          className={clsx(
            'flex items-center gap-[6px] py-[8px] px-[12px] min-w-[150px] rounded-[14px] cursor-pointer',
            isActive('perps')
              ? 'text-r-neutral-title2'
              : 'text-rb-neutral-secondary'
          )}
        >
          <RcIconPerpsCC className="text-rb-neutral-secondary" />
          <div>
            <div
              className={clsx(
                'text-[16px] leading-[19px] font-bold',
                isActive('perps')
                  ? 'text-r-neutral-title2'
                  : 'text-rb-neutral-foot'
              )}
            >
              {t('component.DesktopNav.perps')}
            </div>
          </div>
        </div>
        <div
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
        </div>
      </div>
    </div>
  );
};
