import { supportedHardwareDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClickAway } from 'react-use';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import Checkbox from '../Checkbox';
import { ReactComponent as RcIconCCLoading } from 'ui/assets/loading-cc.svg';
import {
  shallowEqual,
  useSignatureStoreOf,
} from '@/ui/component/MiniSignV2/state';
import type { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';
export const ToConfirmBtn = (props: {
  title: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  isHardWallet?: boolean;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
  buttonClassName?: string;
}) => {
  const { t } = useTranslation();
  const [toConfirm, setToConfirm] = useState(false);
  const handle: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    if (props.disabled || props.loading) {
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
        props.loading || props.disabled
          ? 'cursor-not-allowed'
          : 'cursor-pointer',
        props.className
      )}
      ref={divRef}
      onClick={handle}
    >
      {props.loading || !toConfirm || props.isHardWallet ? (
        <Button
          htmlType={props.htmlType || 'button'}
          type="primary"
          disabled={props.disabled}
          block
          className={clsx(
            'h-[48px] rounded-[8px]',
            props.loading && 'border-[#3646d9] bg-[#3646d9]',
            props.buttonClassName
          )}
          style={
            props.loading
              ? {
                  boxShadow: '0px 8px 16px rgba(134, 151, 255, 0.3)',
                }
              : {}
          }
        >
          <div className="flex items-center justify-center gap-6">
            {props.loading ? (
              <RcIconCCLoading
                viewBox="0 0 24 24"
                className="w-16 h-16 animate-spin text-r-neutral-title2"
              />
            ) : null}
            {props?.title}
          </div>
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

export const DirectSignToConfirmBtn = ({
  showRiskTips,
  riskLabel,
  riskReset,
  overwriteDisabled,
  accountType,
  signatureInstance,
  onCancel: propOnCancel,
  containerClassName,
  ...props
}: {
  showRiskTips?: boolean;
  riskLabel?: React.ReactNode;
  riskReset?: boolean;
  overwriteDisabled?: boolean;
  accountType?: string;
  signatureInstance: SignatureManager;
  onCancel?: () => void;
  containerClassName?: string;
} & React.ComponentProps<typeof ToConfirmBtn>) => {
  const {
    status,
    txsCalcLength,
    gasMethod,
    noCustomRPC,
    gasAccountBalanceEnough,
    gasAccountChainNotSupport,
    gasAccountIsGasAccount,
    gasAccountErrMsg,
    isGasNotEnough,
    gaslessIsGasless,
    hasGaslessPromotion,
    useGaslessEnabled,
    hasForbiddenCheckError,
  } = useSignatureStoreOf(
    signatureInstance,
    (state) => ({
      status: state.status,
      txsCalcLength: state.ctx?.txsCalc?.length || 0,
      gasMethod: state.ctx?.gasMethod,
      noCustomRPC: !!state.ctx?.noCustomRPC,
      gasAccountBalanceEnough: !!state.ctx?.gasAccount?.balance_is_enough,
      gasAccountChainNotSupport: !!state.ctx?.gasAccount?.chain_not_support,
      gasAccountIsGasAccount: !!state.ctx?.gasAccount?.is_gas_account,
      gasAccountErrMsg: (state.ctx?.gasAccount as any)?.err_msg,
      isGasNotEnough: !!state.ctx?.isGasNotEnough,
      gaslessIsGasless: !!state.ctx?.gasless?.is_gasless,
      hasGaslessPromotion: !!state.ctx?.gasless?.promotion,
      useGaslessEnabled: !!state.ctx?.useGasless,
      hasForbiddenCheckError: !!state.ctx?.checkErrors?.some(
        (error) => error.level === 'forbidden'
      ),
    }),
    shallowEqual
  );

  const gasAccountCanPay =
    gasMethod === 'gasAccount' &&
    noCustomRPC &&
    gasAccountBalanceEnough &&
    !gasAccountChainNotSupport &&
    gasAccountIsGasAccount &&
    !gasAccountErrMsg;

  const useGasLess =
    (isGasNotEnough || hasGaslessPromotion) &&
    gaslessIsGasless &&
    useGaslessEnabled;
  const loading =
    status === 'prefetching' || status === 'signing' || !txsCalcLength;

  const disabledProcess = txsCalcLength
    ? gasMethod === 'gasAccount'
      ? !gasAccountCanPay
      : useGasLess
      ? false
      : !!loading || !txsCalcLength || hasForbiddenCheckError
    : false;

  const { t } = useTranslation();
  const [riskChecked, setRiskChecked] = useState(false);

  const riskDisabled = showRiskTips ? !riskChecked : false;

  const isHardWallet = useMemo(() => {
    return supportedHardwareDirectSign(accountType || '');
  }, [accountType]);

  const onCancel = useCallback(() => {
    setRiskChecked(false);
    if (propOnCancel) {
      propOnCancel();
    }
  }, [propOnCancel]);

  useEffect(() => {
    if (riskReset) {
      setRiskChecked(false);
    }
  }, [riskReset]);

  return (
    <div
      className={clsx('w-full flex flex-col gap-[15px]', containerClassName)}
    >
      {showRiskTips ? (
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
              {riskLabel || t('page.swap.understandRisks')}
            </span>
          </Checkbox>
        </div>
      ) : null}
      <ToConfirmBtn
        {...props}
        isHardWallet={isHardWallet}
        onCancel={onCancel}
        disabled={
          (overwriteDisabled
            ? props.disabled
            : props.disabled || disabledProcess) || riskDisabled
        }
      />
    </div>
  );
};
