import { Button, Tooltip } from 'antd';
import React from 'react';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { GasLessAnimatedWrapper } from './GasLessComponents';

export const ProcessActions: React.FC<Props> = ({
  onSubmit,
  onCancel,
  disabledProcess,
  tooltipContent,
  gasLess,
}) => {
  const { t } = useTranslation();
  return (
    <ActionsContainer onCancel={onCancel}>
      <Tooltip
        overlayClassName="rectangle sign-tx-forbidden-tooltip"
        title={tooltipContent}
      >
        <GasLessAnimatedWrapper className="absolute left-0 right-0 w-[246px]">
          <Button
            disabled={disabledProcess}
            type="ghost"
            className={clsx(
              gasLess && 'gasLess text-r-neutral-title2',
              !gasLess && 'text-blue-light',
              'border-blue-light',
              'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
              'w-[246px] h-[48px]',
              'disabled:bg-transparent disabled:opacity-40 disabled:hover:bg-transparent',
              'rounded-[8px]',
              'before:content-none'
            )}
            onClick={onSubmit}
          >
            {t('page.signFooterBar.beginSigning')}
          </Button>
        </GasLessAnimatedWrapper>
      </Tooltip>
    </ActionsContainer>
  );
};
