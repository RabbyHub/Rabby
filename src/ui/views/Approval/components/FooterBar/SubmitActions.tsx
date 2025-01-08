import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { ReactComponent as IconClose } from 'ui/assets/close-16-cc.svg';
import { GasLessAnimatedWrapper } from './GasLessComponents';
import styled from 'styled-components';
import { LoadingOutlined } from '@ant-design/icons';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const ButtonStyled = styled(Button)`
  &:hover {
    box-shadow: 0px 6px 8px 0px rgba(112, 132, 255, 0.25);
  }
`;

export const SubmitActions: React.FC<Props> = ({
  disabledProcess,
  onSubmit,
  onCancel,
  tooltipContent,
  enableTooltip,
  gasLess,
  gasLessThemeColor,
  isGasNotEnough,
  isSubmitting,
}) => {
  const { t } = useTranslation();
  const [isSign, setIsSign] = React.useState(false);

  const handleClickSign = React.useCallback(() => {
    setIsSign(true);
  }, []);

  const handleClickConfirm = React.useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  const handleClickCancel = React.useCallback(() => {
    setIsSign(false);
  }, []);

  return (
    <ActionsContainer onCancel={onCancel}>
      {isSign ? (
        <div
          className={clsx(
            'bg-blue-light',
            'text-white',
            'rounded-[8px] h-[48px]',
            'flex items-center',
            'relative',
            'before:absolute before:right-[60px]',
            'before:bg-[#FFFFFF1A]',
            'before:h-[32px] before:w-1',
            'hover:before:hidden',
            'overflow-hidden',
            isSubmitting ? 'opacity-70 pointer-events-none' : ''
          )}
        >
          <button
            className={clsx(
              'hover:bg-[#00000033]',
              'w-[184px] h-full',
              'font-medium',
              isSubmitting ? 'flex items-center justify-center gap-[8px]' : ''
            )}
            onClick={handleClickConfirm}
          >
            {isSubmitting ? (
              <div className="text-[14px]">
                <LoadingOutlined className="block" />
              </div>
            ) : null}
            {t('global.confirmButton')}
          </button>
          <button
            className={clsx(
              'hover:bg-[#00000033]',
              'w-[60px] h-full',
              'flex justify-center items-center'
            )}
            onClick={handleClickCancel}
          >
            <IconClose className="text-r-neutral-title-2" />
          </button>
        </div>
      ) : (
        <TooltipWithMagnetArrow
          overlayClassName="rectangle sign-tx-forbidden-tooltip"
          title={enableTooltip ? tooltipContent : null}
          inApproval
          viewportOffset={[20, -20, -20, 20]}
        >
          <GasLessAnimatedWrapper>
            <ButtonStyled
              disabled={disabledProcess}
              type="primary"
              className={clsx(
                gasLess && 'gasLess',
                gasLessThemeColor && 'gasLessConfig',
                'w-[246px] h-[48px] rounded-[8px]',
                'disabled:text-opacity-40 disabled:bg-blue-light disabled:bg-opacity-40 border-transparent',
                'before:content-none'
              )}
              style={
                gasLessThemeColor
                  ? {
                      '--gas-theme-color': gasLessThemeColor,
                      '--gas-bg-color': isGasNotEnough
                        ? 'rgba(112, 132, 255,0.4)'
                        : 'var(--r-blue-default, #7084ff)',
                    }
                  : {}
              }
              onClick={handleClickSign}
            >
              {t('page.signFooterBar.signAndSubmitButton')}
            </ButtonStyled>
          </GasLessAnimatedWrapper>
        </TooltipWithMagnetArrow>
      )}
    </ActionsContainer>
  );
};
