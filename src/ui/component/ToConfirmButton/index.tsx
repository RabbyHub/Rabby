import { useGetDisableProcessDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useEffect, useRef } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClickAway } from 'react-use';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import Checkbox from '../Checkbox';

export const ToConfirmBtn = (props: {
  title: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  isHardWallet?: boolean;
  onCancel?: () => void;
}) => {
  const { t } = useTranslation();
  const [toConfirm, setToConfirm] = useState(false);
  const handle: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    if (props.disabled) {
      return;
    }

    if (props.isHardWallet) {
      props.onConfirm();
    }

    if (toConfirm) {
      setToConfirm(false);
      props.onConfirm();
    } else {
      setToConfirm(true);
    }
  };

  const cancel: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      e.stopPropagation();
      setToConfirm(false);
      props.onCancel?.();
    },
    [props.onCancel]
  );
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
      {!toConfirm || props.isHardWallet ? (
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
  overwriteDisabled?: boolean;
  showRiskTips?: boolean;
  riskLabel?: React.ReactNode;
  isHardWallet?: boolean;
  onCancel?: () => void;
  riskReset?: boolean;
}) => {
  const disabledProcess = useGetDisableProcessDirectSign();
  const { t } = useTranslation();
  const [riskChecked, setRiskChecked] = useState(false);

  const riskDisabled = props.showRiskTips ? !riskChecked : false;

  const onCancel = useCallback(() => {
    setRiskChecked(false);
    if (props.onCancel) {
      props.onCancel();
    }
  }, [props.onCancel]);

  useEffect(() => {
    if (props.riskReset) {
      setRiskChecked(false);
    }
  }, [props.riskReset]);

  return (
    <div className="w-full flex flex-col gap-[15px]">
      {props.showRiskTips ? (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={riskChecked}
            type="square"
            onChange={setRiskChecked}
            unCheckBackground="transparent"
            width="14px"
            height="14px"
            checkBoxClassName={clsx(
              'rounded-[2px] border border-solid',
              !riskChecked
                ? 'border-rabby-neutral-body'
                : 'border-rabby-blue-default'
            )}
            checkIcon={
              riskChecked ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    width="14"
                    height="14"
                    rx="2"
                    fill="var(--r-blue-default, #4c65ff)"
                  />
                  <path
                    d="M3 7L5.66667 10L11 4"
                    stroke="white"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null
            }
          >
            <span className="text-rabby-neutral-body text-13 font-normal">
              {props?.riskLabel || t('page.swap.understandRisks')}
            </span>
          </Checkbox>
        </div>
      ) : null}
      <ToConfirmBtn
        {...props}
        onCancel={onCancel}
        disabled={
          (props.overwriteDisabled
            ? props.disabled
            : props.disabled || disabledProcess) || riskDisabled
        }
      />
    </div>
  );
};
