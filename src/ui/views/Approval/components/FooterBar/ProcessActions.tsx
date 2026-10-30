import { Button } from 'antd';
import React from 'react';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { GasLessAnimatedWrapper } from './GasLessComponents';
import { TooltipV6 } from '@/ui/component/Tooltip/TooltipV6';

export const ProcessActions: React.FC<Props> = ({
  onSubmit,
  onCancel,
  disabledProcess,
  tooltipContent,
  tooltipVisible,
  gasLess,
  gasLessThemeColor,
  isGasNotEnough,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <ActionsContainer onCancel={onCancel}>
      <TooltipV6
        overlayClassName="rectangle sign-tx-forbidden-tooltip"
        // keep a 20px gap to the window edges (patched dom-align)
        align={{ viewportOffset: [20, -20, -20, 20] }}
        // below Popup / Modal (1000) so an open drawer covers the always-on tooltip
        zIndex={999}
        title={tooltipContent}
        // rc-tooltip shows an empty popup for an empty title, unlike antd
        visible={tooltipVisible || (tooltipContent ? undefined : false)}
      >
        <GasLessAnimatedWrapper className="absolute left-0 right-0 w-[246px]">
          <Button
            disabled={disabledProcess}
            type="ghost"
            className={clsx(
              gasLess && 'gasLess text-r-neutral-title2',
              gasLessThemeColor && 'gasLessConfig',
              !gasLess && 'text-blue-light',
              'border-blue-light',
              'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
              'w-[246px] h-[48px]',
              'disabled:bg-transparent disabled:opacity-40 disabled:hover:bg-transparent',
              'rounded-[8px]',
              'before:content-none'
            )}
            style={
              gasLessThemeColor
                ? {
                    '--gas-theme-color': gasLessThemeColor,
                    '--gas-bg-color': isGasNotEnough
                      ? 'var(--r-blue-disable)'
                      : 'var(--r-blue-default, #7084ff)',
                  }
                : {}
            }
            onClick={onSubmit}
          >
            {children ? children : t('page.signFooterBar.beginSigning')}
          </Button>
        </GasLessAnimatedWrapper>
      </TooltipV6>
    </ActionsContainer>
  );
};
