import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncRetry } from 'react-use';
import { useWallet, openInternalPageInTab } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES } from '@/constant';
import * as uuid from 'uuid';
import { UR, UREncoder } from '@ngraveio/bc-ur';
import { URDecoder } from '@ngraveio/bc-ur';
import { ETHSignature } from '@keystonehq/bc-ur-registry-eth';
import {
  ApprovalPopupContainer,
  Props as ApprovalPopupContainerProps,
} from '../../Popup/ApprovalPopupContainer';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

const SHOULD_RETRY_KEYWORDS = [
  'A transfer error has occurred.',
  'Previous request is not finished',
];

const AUTO_RETRY_KEYWORDS = [
  'An operation that changes interface state is in progress.',
];

const SHOULD_OPEN_PERMISSION_PAGE_KEYWORDS = [
  'disconnected',
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
  const [statusProp, setStatusProp] = React.useState<
    ApprovalPopupContainerProps['status']
  >('SENDING');
  const decoder = useRef(new URDecoder());

  const { value, error, retry, loading } = useAsyncRetry(async () => {
    if (!(payload?.cbor && payload?.type)) return null;
    return await wallet.requestKeyring(
      KEYSTONE_TYPE,
      'signTransactionUrViaUSB',
      null,
      buildKeystoneSignPayload(payload)
    );
  }, [payload, requestId]);

  const handleRetry = useCallback(async () => {
    setErrorMessage('');
    await onRetry();
    retry();
  }, [setErrorMessage, onRetry, retry]);

  const description = useMemo(() => {
    if (statusProp !== 'REJECTED') {
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
        handleCancel();
        openInternalPageInTab('request-permission?type=keystone&from=approval');
        return '';
      }
      if (
        AUTO_RETRY_KEYWORDS.some((keyword) => error.message.includes(keyword))
      ) {
        handleRetry();
        return '';
      }
      if (
        SHOULD_RETRY_KEYWORDS.some((keyword) => error.message.includes(keyword))
      ) {
        return t('page.signFooterBar.keystone.shouldRetry');
      }
      return error.message;
    }
    return '';
  }, [error, errorMessage, statusProp]);

  useEffect(() => {
    setHiddenSwitchButton(['FAILED', 'REJECTED'].includes(statusProp));
  }, [statusProp]);

  const content = useMemo(() => {
    if (loading) {
      setStatusProp('WAITING');
      return t('page.signFooterBar.keystone.siging');
    }
    if (error || errorMessage) {
      setStatusProp('REJECTED');
      return t('page.signFooterBar.keystone.txRejected');
    }
    if (isDone) {
      if (error || errorMessage) {
        setStatusProp('REJECTED');
        return t('page.signFooterBar.keystone.txRejected');
      }
      setStatusProp('RESOLVED');
      return t('page.signFooterBar.qrcode.sigCompleted');
    }
    if (value?.payload) {
      decoder.current.receivePart(value?.payload);
      if (decoder.current.isComplete()) {
        const ur = decoder.current.resultUR();
        if (ur.type === 'eth-signature') {
          const ethSignature = ETHSignature.fromCBOR(ur.cbor);

          const buffer = ethSignature.getRequestId();
          const signId = uuid.stringify(buffer as any);
          if (signId === requestId) {
            handleSuccess(ur.cbor.toString('hex'));
          } else {
            setStatusProp('REJECTED');
            setErrorMessage(t('page.signFooterBar.keystone.misMatchSignId'));
          }
        } else {
          setStatusProp('REJECTED');
          setErrorMessage(t('page.signFooterBar.keystone.unsupportedType'));
        }
      }
    }
    setStatusProp('SENDING');
    return t('page.signFooterBar.keystone.siging');
  }, [value, error, errorMessage, loading, isDone, requestId, description]);

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
