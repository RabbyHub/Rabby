import { Button } from 'antd';
import React from 'react';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { GasLessAnimatedWrapper } from './GasLessComponents';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

export const ProcessActions: React.FC<Props> = ({
  onSubmit,
  onCancel,
  disabledProcess,
  tooltipContent,
  gasLess,
  gasLessThemeColor,
  isGasNotEnough,
}) => {
  const { t } = useTranslation();
  return (
    <ActionsContainer onCancel={onCancel}>
      <TooltipWithMagnetArrow
        overlayClassName="rectangle sign-tx-forbidden-tooltip"
        title={tooltipContent}
        viewportOffset={[20, -20, -20, 20]}
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
            {t('page.signFooterBar.beginSigning')}
          </Button>
        </GasLessAnimatedWrapper>
      </TooltipWithMagnetArrow>
    </ActionsContainer>
  );
};
