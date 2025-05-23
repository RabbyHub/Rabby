import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getOriginFromUrl } from '@/utils';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { Button, message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import React, {
  cloneElement,
  CSSProperties,
  memo,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import IconDapps from 'ui/assets/dapps.svg';
import { ReactComponent as RCIconDisconnectCC } from 'ui/assets/dashboard/current-connection/cc-disconnect.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-circle.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';
import { findChain } from '@/utils/chain';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useMemoizedFn } from 'ahooks';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import IconLightBulb from '@/ui/assets/light-bulb.svg';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/triangle-down-cc.svg';
import ReactDOM from 'react-dom';

interface Props {
  children: ReactElement;
  onClose?(): void;
}
export const CurrentConnectionGuide = memo(({ children, onClose }: Props) => {
  const triggerRef = useRef<HTMLElement>(null);
  const { t } = useTranslation();

  const calculatePosition = () => {
    if (!triggerRef.current) return {};

    const rect = triggerRef.current.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const popoverPosition: CSSProperties = {
      position: 'absolute',
      bottom: `${window.innerHeight - rect.top + scrollY + 20}px`,
      left: 20,
      right: 20,
    };

    const triggerWarperPosition: CSSProperties = {
      position: 'absolute',
      left: `${rect.left - 8}px`,
      bottom: `${window.innerHeight - rect.bottom - 8 + scrollY}px`,
      width: rect.width + 16,
      height: rect.height + 16,
      borderRadius: 12,
      padding: 8,
    };

    const trianglePosition: CSSProperties = {
      left: `${rect.left + rect.width / 2 - 20}px`,
    };

    return {
      popoverPosition,
      triggerWarperPosition,
      trianglePosition,
    };
  };

  const position = calculatePosition();

  return (
    <>
      {cloneElement(children, {
        ref: triggerRef,
        style: {
          visibility: 'hidden',
        },
      })}
      {ReactDOM.createPortal(
        <div
          className={clsx('fixed w-full h-full left-0 right-0 top-0 bottom-0')}
        >
          <div
            className="absolute top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.5)]"
            onClick={() => {
              onClose?.();
            }}
          ></div>
          <div className="absolute top-0 left-0 w-full h-full z-10">
            <div
              className={clsx(
                'bg-r-blue-light1 rounded-[8px] py-[16px] px-[10px]',
                'flex items-center gap-[3px]'
              )}
              style={position?.popoverPosition}
              onClick={() => {
                onClose?.();
              }}
            >
              <img
                src={IconLightBulb}
                className="w-[23px] h-[23px]"
                alt="light bulb icon"
              />
              <div className="text-r-neutral-title-1 text-[12px] leading-[17px] font-medium">
                {t('page.dashboard.recentConnectionGuide.title')}
              </div>
              <Button
                className="ml-auto h-[28px] py-0 shadow-none"
                type="primary"
              >
                {t('page.dashboard.recentConnectionGuide.button')}
              </Button>
              <div
                className="text-r-blue-light-1 absolute bottom-[-14px]"
                style={position.trianglePosition}
              >
                <RcIconTriangle className="w-[20px] h-[20px]" />
              </div>
            </div>
            <div
              className="z-10 bg-r-neutral-card2"
              style={position?.triggerWarperPosition}
              onClick={() => {
                onClose?.();
              }}
            >
              <div className="pointer-events-none">{children}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
});
