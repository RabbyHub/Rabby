import { Button, Tooltip } from 'antd';
import React from 'react';
import { ActionsContainer, Props } from './ActionsContainer';
import clsx from 'clsx';
import { ReactComponent as IconClose } from 'ui/assets/close-white.svg';

export const SubmitActions: React.FC<Props> = ({
  disabledProcess,
  onSubmit,
  onCancel,
  tooltipContent,
  enableTooltip,
}) => {
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
            'bg-blue-light text-white',
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
              'hover:bg-[#00000033]',
              'w-[184px] h-full',
              'font-medium'
            )}
            onClick={handleClickConfirm}
          >
            Confirm
          </button>
          <button
            className={clsx(
              'hover:bg-[#00000033]',
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
              className={clsx(
                'w-[246px] h-[48px] rounded-[8px]',
                'disabled:opacity-40 disabled:bg-blue-light',
                'before:content-none'
              )}
              onClick={handleClickSign}
            >
              Sign and Submit
            </Button>
          </div>
        </Tooltip>
      )}
    </ActionsContainer>
  );
};
