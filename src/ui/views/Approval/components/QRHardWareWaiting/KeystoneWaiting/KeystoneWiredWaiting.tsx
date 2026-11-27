import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncRetry } from 'react-use';
import { useMemoizedFn } from 'ahooks';
import { useWallet, openInternalPageInTab, useCommonPopupView } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import * as uuid from 'uuid';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { URDecoder } from '@ngraveio/bc-ur';
import { Trans } from 'react-i18next';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from '../../Popup/ApprovalPopupContainer';
import { useKeystoneUSBErrorMessage } from '@/ui/utils/keystone';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

const SHOULD_RETRY_KEYWORDS = [
  'A transfer error has occurred.',
  'Previous request is not finished',
];

const AUTO_RETRY_KEYWORDS = [
  'state is in progress.',
  "Failed to execute 'releaseInterface' on 'USBDevice'",
];

const SHOULD_OPEN_PERMISSION_PAGE_KEYWORDS = [
  'The device was disconnected',
  'cannot be found',
];

const buildKeystoneSignPayload = (payload: any) => {
  return new UREncoder(
    new UR(
      Buffer.from(
        (payload.cbor as unknown) as WithImplicitCoercion<string>,
        'hex'
      ),
      payload.type
    ),
    Infinity
  )
    .nextPart()
    .toUpperCase();
};

interface IKeystoneWaitingProps {
  payload?: {
    type: string;
    cbor: string;
  };
  isDone: boolean;
  onDone: () => void;
  errorMessage?: string;
  setErrorMessage: (message: string) => void;
  handleSuccess: (scanMessage: any) => void;
  onRetry: any;
  handleCancel: () => void;
  setHiddenSwitchButton: (hidden: boolean) => void;
  [key: string]: any;
}

export const KeystoneWiredWaiting: React.FC<IKeystoneWaitingProps> = ({
  onDone,
  isDone,
  payload,
  requestId,
  errorMessage,
  setErrorMessage,
  handleSuccess,
  handleCancel,
  setHiddenSwitchButton,
  onRetry,
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const { setHeight } = useCommonPopupView();

  useEffect(() => {
    setHeight('fit-content');
  }, []);

  const { value, error, retry, loading } = useAsyncRetry(async () => {
    if (!(payload?.cbor && payload?.type)) return null;
    return await wallet.requestKeyring(
      KEYSTONE_TYPE,
      'signTransactionUrViaUSB',
      null,
      buildKeystoneSignPayload(payload)
    );
  }, [payload, requestId]);

  const handleRetry = useMemoizedFn(async () => {
    setErrorMessage('');
    await onRetry();
    retry();
  });

  const shouldAutoRetry = useMemo(() => {
    if (error?.message) {
      return AUTO_RETRY_KEYWORDS.some((keyword) =>
        error.message.includes(keyword)
      );
    }
    return false;
  }, [error]);

  // Derived during render with no side effects. Auto-retry and submitting the
  // signature happen in the effects below.
  const statusProp = useMemo<ApprovalPopupContainerProps['status']>(() => {
    if (loading) return 'WAITING';
    if (error || errorMessage) return shouldAutoRetry ? 'WAITING' : 'REJECTED';
    if (isDone) return 'RESOLVED';
    return 'SENDING';
  }, [loading, error, errorMessage, shouldAutoRetry, isDone]);

  const keystoneErrorCatcher = useKeystoneUSBErrorMessage();

  const description = useMemo(() => {
    if (statusProp !== 'REJECTED' || shouldAutoRetry) {
      return '';
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (error) {
      if (
        SHOULD_OPEN_PERMISSION_PAGE_KEYWORDS.some((keyword) =>
          error.message.includes(keyword)
        )
      ) {
        return (
          <Trans t={t} i18nKey="page.dashboard.hd.ledger.reconnect">
            If it doesn't work, please try
            <span
              className="underline cursor-pointer"
              onClick={() => {
                handleCancel();
                openInternalPageInTab(
                  'request-permission?type=keystone&from=approval'
                );
              }}
            >
              reconnecting from the beginning.
            </span>
          </Trans>
        );
      }
      if (
        SHOULD_RETRY_KEYWORDS.some((keyword) => error.message.includes(keyword))
      ) {
        return t('page.signFooterBar.keystone.shouldRetry');
      }
      return keystoneErrorCatcher(error);
    }
    return '';
  }, [error, errorMessage, statusProp, shouldAutoRetry]);

  useEffect(() => {
    setHiddenSwitchButton(['FAILED', 'REJECTED'].includes(statusProp));
  }, [statusProp]);

  const content = useMemo(() => {
    if (statusProp === 'REJECTED') {
      return t('page.signFooterBar.qrcode.txFailed');
    }
    if (statusProp === 'RESOLVED') {
      return t('page.signFooterBar.qrcode.sigCompleted');
    }
    return t('page.signFooterBar.keystone.siging');
  }, [statusProp, t]);

  // Retry once per transient USB error.
  const autoRetriedErrorRef = useRef<Error>();
  useEffect(() => {
    if (loading || !error || !shouldAutoRetry) return;
    if (autoRetriedErrorRef.current === error) return;
    autoRetriedErrorRef.current = error;
    handleRetry();
  }, [loading, error, shouldAutoRetry, handleRetry]);

  // Each device response is decoded on its own and submitted at most once. The old
  // render-time decoder was shared across retries: once complete it ignored new parts
  // and kept returning its first result.
  const submitDeviceResponse = useMemoizedFn((part: string) => {
    const decoder = new URDecoder();
    decoder.receivePart(part);
    if (!decoder.isComplete()) return;

    const ur = decoder.resultUR();
    if (ur.type !== 'eth-signature') {
      setErrorMessage(t('page.signFooterBar.keystone.unsupportedType'));
      return;
    }
    const signId = uuid.stringify(
      ETHSignature.fromCBOR(ur.cbor).getRequestId() as any
    );
    if (signId !== requestId) {
      setErrorMessage(t('page.signFooterBar.keystone.misMatchSignId'));
      return;
    }
    handleSuccess(ur.cbor.toString('hex'));
  });

  const handledValueRef = useRef<unknown>();
  useEffect(() => {
    if (!value?.payload || handledValueRef.current === value) return;
    // Same gate as before: never submit while loading, failed, or already done.
    if (loading || error || errorMessage || isDone) return;
    handledValueRef.current = value;
    submitDeviceResponse(value.payload);
  }, [value, loading, error, errorMessage, isDone, submitDeviceResponse]);

  return (
    <ApprovalPopupContainer
      showAnimation={loading || ['SENDING', 'WAITING'].includes(statusProp)}
      hdType="wired"
      status={statusProp}
      onRetry={handleRetry}
      onDone={onDone}
      onCancel={handleCancel}
      content={content}
      description={description}
    />
  );
};
