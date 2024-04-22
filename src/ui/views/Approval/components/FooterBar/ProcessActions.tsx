import { Button, Tooltip } from 'antd';
import React from 'react';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const ButtonWrapper = styled(Button)`
  &.gasLess {
    position: relative;
    border-radius: 6px;
    border: 1px solid transparent;

    &:hover,
    &:active {
      background: linear-gradient(
        92deg,
        rgba(97, 189, 255, 0.1) 5.19%,
        rgba(128, 90, 255, 0.1) 98.4%
      );
    }

    & > span {
      background: linear-gradient(93deg, #60bcff 13.49%, #9570ff 94.44%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    &::after {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(93deg, #60bcff 13.49%, #9570ff 94.44%);
      content: '';
      border-radius: 6px;
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      padding: 1px;
    }
  }
`;

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
        <div className="absolute left-0 right-0">
          <ButtonWrapper
            disabled={disabledProcess}
            type="ghost"
            className={clsx(
              gasLess && 'gasLess',
              !gasLess && ' border-blue-light text-blue-light',
              !gasLess && 'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
              'w-[246px] h-[48px]',
              'disabled:bg-transparent disabled:opacity-40 disabled:hover:bg-transparent',
              'rounded-[8px]',
              'before:content-none'
            )}
            onClick={onSubmit}
          >
            {t('page.signFooterBar.beginSigning')}
          </ButtonWrapper>
        </div>
      </Tooltip>
    </ActionsContainer>
  );
};
