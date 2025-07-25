import { useGetDisableProcessDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useEffect, useRef } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClickAway } from 'react-use';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

export const ToConfirmBtn = (props: {
  title: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
}) => {
  const { t } = useTranslation();
  const [toConfirm, setToConfirm] = useState(false);
  const handle: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    if (props.disabled) {
      return;
    }

    if (toConfirm) {
      setToConfirm(false);
      props.onConfirm();
    } else {
      setToConfirm(true);
    }
  };

  const cancel: React.MouseEventHandler<HTMLDivElement> = useCallback((e) => {
    e.stopPropagation();
    setToConfirm(false);
  }, []);
  const divRef = useRef<HTMLDivElement>(null);
  useClickAway(divRef, () => setToConfirm(false));

  useEffect(() => {
    if (props.disabled) {
      setToConfirm(false);
    }
  }, [props.disabled]);

  return (
    <div
      className={clsx(
        'h-[48px] p-0 w-full rounded-[8px]',
        'flex items-center justify-center',
        toConfirm ? 'bg-r-blue-default' : '',
        'text-r-neutral-title-2 text-[15px] font-medium',
        props.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      )}
      ref={divRef}
      onClick={handle}
    >
      {!toConfirm ? (
        <Button
          htmlType={props.htmlType || 'button'}
          type="primary"
          disabled={props.disabled}
          block
          className="h-[48px] rounded-[8px]"
        >
          {props?.title}
        </Button>
      ) : (
        <div className={clsx('w-full h-full flex items-center', 'group')}>
          <Button
            type="primary"
            className={clsx(
              'relative flex-1 h-full flex items-center justify-center rounded-l-[8px] rounded-r-none',
              'bg-transparent',
              'hover:bg-[rgba(0,0,0,0.2)]'
            )}
          >
            {t('global.confirm')}

            <div
              className={clsx(
                'h-[28px] w-[1px]',
                'bg-r-neutral-bg1 opacity-10',
                'absolute top-1/2 right-0 -translate-y-1/2',
                'group-hover:hidden'
              )}
            />
          </Button>

          <Button
            htmlType={'button'}
            type="primary"
            className={clsx(
              'w-[56px] h-full flex items-center justify-center bg-transparent rounded-l-none rounded-r-[8px]'
            )}
            onClick={cancel}
          >
            <RcIconCloseCC
              viewBox="0 0 20 20"
              className="w-16 h-16 text-r-neutral-title2"
            />
          </Button>
        </div>
      )}
    </div>
  );
};

export const DirectSignToConfirmBtn = (props: {
  title: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}) => {
  const disabledProcess = useGetDisableProcessDirectSign();
  return (
    <ToConfirmBtn {...props} disabled={props.disabled || disabledProcess} />
  );
};
