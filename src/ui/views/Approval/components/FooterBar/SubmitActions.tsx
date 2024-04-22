import { Button, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { ReactComponent as IconClose } from 'ui/assets/close-white.svg';

export const SubmitActions: React.FC<Props> = ({
  disabledProcess,
  onSubmit,
  onCancel,
  tooltipContent,
  enableTooltip,
  gasLess,
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
          style={
            gasLess
              ? {
                  background:
                    'linear-gradient(93deg, #60BCFF 13.49%, #8154FF 94.44%)',
                }
              : {}
          }
          className={clsx(
            !gasLess && 'bg-blue-light',
            'text-white',
            'rounded-[8px] h-[48px]',
            'flex items-center',
            'relative',
            'before:absolute before:right-[60px]',
            'before:bg-[#FFFFFF1A]',
            'before:h-[32px] before:w-1',
            'hover:before:hidden',
            'overflow-hidden'
          )}
        >
          <button
            className={clsx(
              gasLess ? 'hover:bg-[#00000033]' : 'hover:bg-[rgba(0,0,0,0.15)]',
              'w-[184px] h-full',
              'font-medium'
            )}
            onClick={handleClickConfirm}
          >
            {t('global.confirmButton')}
          </button>
          <button
            className={clsx(
              gasLess ? 'hover:bg-[#00000033]' : 'hover:bg-[rgba(0,0,0,0.15)]',
              'w-[60px] h-full',
              'flex justify-center items-center'
            )}
            onClick={handleClickCancel}
          >
            <IconClose />
          </button>
        </div>
      ) : (
        <Tooltip
          overlayClassName="rectangle sign-tx-forbidden-tooltip"
          title={enableTooltip ? tooltipContent : null}
        >
          <div>
            <Button
              disabled={disabledProcess}
              type="primary"
              style={
                gasLess
                  ? {
                      background:
                        'linear-gradient(93deg, #60BCFF 13.49%, #8154FF 94.44%)',
                    }
                  : {}
              }
              className={clsx(
                'w-[246px] h-[48px] rounded-[8px]',
                'disabled:opacity-40 disabled:bg-blue-light',
                'before:content-none'
              )}
              onClick={handleClickSign}
            >
              {t('page.signFooterBar.signAndSubmitButton')}
            </Button>
          </div>
        </Tooltip>
      )}
    </ActionsContainer>
  );
};
