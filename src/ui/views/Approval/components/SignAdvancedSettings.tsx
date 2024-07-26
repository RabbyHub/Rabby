import { Card } from './Card';
import { Button, Form, Input, Tooltip } from 'antd';
import { ValidateStatus } from 'antd/lib/form/FormItem';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import { MINIMUM_GAS_LIMIT } from 'consts';
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import styled from 'styled-components';

const ManuallySetGasLimitAlert = styled.li`
  font-weight: 400;
  font-size: 13px;
  line-height: 15px;
  color: var(--r-neutral-body);
`;

const Div = styled.div``;

export interface GasSelectorResponse {
  gasLimit: number;
  nonce: number;
}

interface GasSelectorProps {
  gasLimit: string | undefined;
  onChange(gas: GasSelectorResponse): void;
  isReady: boolean;
  recommendGasLimit: number | string | BigNumber;
  recommendNonce: number | string | BigNumber;
  nonce: string;
  disableNonce: boolean;
  disabled?: boolean;
  manuallyChangeGasLimit: boolean;
}

export const SignAdvancedSettings = ({
  gasLimit,
  onChange,
  isReady,
  recommendGasLimit,
  recommendNonce,
  nonce,
  disableNonce,
  disabled,
  manuallyChangeGasLimit,
}: GasSelectorProps) => {
  const gasLimitInputRef = React.useRef<Input>(null);
  const [visible, setVisible] = React.useState(false);
  const { t } = useTranslation();
  const [afterGasLimit, setGasLimit] = useState<string | number>(
    Number(gasLimit)
  );
  const [customNonce, setCustomNonce] = useState(Number(nonce));
  const [isFirstTimeLoad, setIsFirstTimeLoad] = useState(true);
  const [validateStatus, setValidateStatus] = useState<
    Record<string, { status: ValidateStatus; message: string | null }>
  >({
    gasLimit: {
      status: 'success',
      message: null,
    },
    nonce: {
      status: 'success',
      message: null,
    },
  });

  const handleSetRecommendTimes = () => {
    if (disabled) return;
    const value = new BigNumber(recommendGasLimit).times(1.5).toFixed(0);
    setGasLimit(value);
  };

  const formValidator = () => {
    const newValue: Record<string, { status: any; message: string | null }> = {
      ...validateStatus,
      gasLimit: {
        status: 'success',
        message: null,
      },
      nonce: {
        status: 'success',
        message: null,
      },
    };

    if (!afterGasLimit) {
      newValue.gasLimit = {
        status: 'error',
        message: t('page.signTx.gasLimitEmptyAlert'),
      };
    } else if (Number(afterGasLimit) < MINIMUM_GAS_LIMIT) {
      newValue.gasLimit = {
        status: 'error',
        message: t('page.signTx.gasLimitMinValueAlert'),
      };
    }
    if (new BigNumber(customNonce).lt(recommendNonce) && !disableNonce) {
      newValue.nonce = {
        status: 'error',
        message: t('page.signTx.nonceLowerThanExpect', [
          new BigNumber(recommendNonce).toString(),
        ]),
      };
    }

    setValidateStatus(newValue);
  };

  const handleConfirmGas = () => {
    onChange({
      gasLimit: Number(afterGasLimit),
      nonce: Number(customNonce),
    });
  };

  const handleGasLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*$/.test(e.target.value)) {
      setGasLimit(e.target.value);
    }
  };

  const handleCustomNonceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (/^\d*$/.test(e.target.value)) {
      setCustomNonce(Number(e.target.value));
    }
  };

  const handleModalConfirmGas = () => {
    handleConfirmGas();
    setVisible(false);
  };

  useEffect(() => {
    setGasLimit(Number(gasLimit));
  }, [gasLimit]);

  useEffect(() => {
    formValidator();
  }, [afterGasLimit, customNonce]);

  useEffect(() => {
    setCustomNonce(Number(nonce));
  }, [nonce]);

  useEffect(() => {
    if (isReady && isFirstTimeLoad) {
      setIsFirstTimeLoad(false);
    }
  }, [isReady]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        gasLimitInputRef.current?.focus();
      }, 50);
    }
  }, [visible]);

  return (
    <>
      <Card
        headline={t('page.signTx.advancedSettings')}
        onClick={() => setVisible(true)}
        hasDivider={manuallyChangeGasLimit}
      >
        {manuallyChangeGasLimit && (
          <ul className="p-16 ml-16 mb-0 list-disc">
            <ManuallySetGasLimitAlert>
              {t('page.signTx.manuallySetGasLimitAlert')} {Number(gasLimit)}
            </ManuallySetGasLimitAlert>
          </ul>
        )}
      </Card>
      <Popup
        isNew
        height={392}
        visible={visible}
        placement="bottom"
        maskClosable
        closable
        isSupportDarkMode
        onClose={() => setVisible(false)}
        className="gas-modal"
        title={t('page.signTx.advancedSettings')}
      >
        <Div>
          <Form onFinish={handleConfirmGas}>
            <div className="gas-limit">
              <p
                className={clsx('gas-limit-label flex leading-[16px]', {
                  disabled: disabled,
                })}
              >
                <span className="flex-1">{t('page.signTx.gasLimitTitle')}</span>
              </p>
              <div className="expanded gas-limit-panel-wrapper widget-has-ant-input">
                <Tooltip
                  overlayClassName="rectangle"
                  title={
                    disabled
                      ? t('page.signTx.gasNotRequireForSafeTransaction')
                      : null
                  }
                >
                  <Form.Item
                    className={clsx('gas-limit-panel mb-0', {
                      disabled: disabled,
                    })}
                    validateStatus={validateStatus.gasLimit.status}
                  >
                    <Input
                      ref={gasLimitInputRef}
                      className="popup-input"
                      value={afterGasLimit}
                      onChange={handleGasLimitChange}
                      disabled={disabled}
                    />
                  </Form.Item>
                </Tooltip>
                {validateStatus.gasLimit.message ? (
                  <p className="tip text-red-light not-italic">
                    {validateStatus.gasLimit.message}
                  </p>
                ) : (
                  <p className={clsx('tip', { disabled: disabled })}>
                    <Trans
                      i18nKey="page.signTx.recommendGasLimitTip"
                      values={{
                        est: Number(recommendGasLimit),
                        current: new BigNumber(afterGasLimit)
                          .div(recommendGasLimit)
                          .toFixed(1),
                      }}
                    />
                    <span
                      className="recommend-times"
                      onClick={handleSetRecommendTimes}
                    >
                      1.5x
                    </span>
                    .
                  </p>
                )}
                <div className={clsx({ 'opacity-50': disableNonce })}>
                  <p className="gas-limit-title mt-20 mb-0 leading-[16px]">
                    {t('page.signTx.nonceTitle')}
                  </p>
                  <Form.Item
                    className="gas-limit-panel mb-0"
                    required
                    validateStatus={validateStatus.nonce.status}
                  >
                    <Input
                      className="popup-input"
                      value={customNonce}
                      onChange={handleCustomNonceChange}
                      disabled={disableNonce}
                    />
                  </Form.Item>
                  {validateStatus.nonce.message ? (
                    <p className="tip text-red-light not-italic">
                      {validateStatus.nonce.message}
                    </p>
                  ) : (
                    <p className="tip">
                      {t('page.signTx.gasLimitModifyOnlyNecessaryAlert')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Form>
        </Div>
        <div className="flex justify-center mt-32 popup-footer">
          <Button
            type="primary"
            className="w-full mx-20"
            size="large"
            onClick={handleModalConfirmGas}
            disabled={!isReady}
          >
            {t('global.confirm')}
          </Button>
        </div>
      </Popup>
    </>
  );
};
