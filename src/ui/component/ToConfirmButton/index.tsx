import { useGetDisableProcessDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
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
      // itemType="submit"
      className={clsx(
        'h-[48px] p-0 w-full rounded-[8px]',
        'flex items-center justify-center',
        'bg-r-blue-default',
        'text-r-neutral-title-2 text-[15px] font-medium',
        props.disabled ? 'opacity-40 cursor-not-allowed' : ' cursor-pointer'
      )}
      ref={divRef}
      onClick={handle}
    >
      {!toConfirm ? (
        props.title
      ) : (
        <>
          <div className={clsx('w-full h-full flex items-center', 'group')}>
            <div
              className={clsx(
                'relative flex-1 h-full flex items-center justify-center ',
                'bg-transparent',
                'hover:bg-[rgba(0,0,0,0.2)]'
              )}
              style={{
                borderRadius: '6px 0px 0px 6px',
              }}
            >
              {t('global.confirm')}

              <div
                className={clsx(
                  'h-[28px] w-[1px]',
                  'bg-r-neutral-bg1 opacity-10',
                  'absolute top-1/2 right-[1px] -translate-y-1/2',
                  'group-hover:hidden'
                )}
              />
            </div>
            <div
              className={clsx(
                'w-[56px] h-full flex items-center justify-center bg-transparent',
                'hover:bg-[rgba(0,0,0,0.2)]'
              )}
              onClick={cancel}
            >
              <RcIconCloseCC
                viewBox="0 0 20 20"
                className="w-16 h-16 text-r-neutral-title2"
              />
            </div>
          </div>
        </>
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
