import React, { useEffect, useMemo, useRef } from 'react';
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
  handleCancel: () => void;
  switchButtonVisibleController: (visible: boolean) => void;
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
  switchButtonVisibleController,
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
  }, []);

  useEffect(() => {
    switchButtonVisibleController(['SENDING', 'WAITING'].includes(statusProp));
  }, [statusProp]);

  const description = useMemo(() => {
    if (statusProp !== 'REJECTED') {
      return '';
    }
    if (errorMessage) {
      return errorMessage;
    }
    if (error) {
      const errorKeywords = ['disconnected', 'cannot be found'];
      if (errorKeywords.some((keyword) => error.message.includes(keyword))) {
        handleCancel();
        openInternalPageInTab('request-permission?type=keystone&from=approval');
        return '';
      }
      return error.message;
    }
    return '';
  }, [error, errorMessage, statusProp]);

  const content = useMemo(() => {
    if (loading) {
      setStatusProp('WAITING');
      return t('page.signFooterBar.keystone.siging');
    }
    if (error || errorMessage) {
      setStatusProp('REJECTED');
      return t('page.signFooterBar.keystone.txRejected');
    }
    if (value?.payload && isDone) {
      decoder.current.receivePart(value?.payload);
      if (decoder.current.isComplete()) {
        const ur = decoder.current.resultUR();
        if (ur.type === 'eth-signature') {
          const ethSignature = ETHSignature.fromCBOR(ur.cbor);

          const buffer = ethSignature.getRequestId();
          const signId = uuid.stringify(buffer as any);
          if (signId === requestId) {
            console.error("ur.cbor.toString('hex')", ur.cbor.toString('hex'));
            handleSuccess(ur.cbor.toString('hex'));
          }
          setErrorMessage(t('page.signFooterBar.keystone.misMatchSignId'));
        } else {
          setErrorMessage(t('page.signFooterBar.keystone.unsupportedType'));
        }
      }
      setStatusProp('RESOLVED');
      return t('page.signFooterBar.qrcode.sigCompleted');
    }
    setStatusProp('SENDING');
    return t('page.signFooterBar.keystone.siging');
  }, [value, error, loading, errorMessage, isDone]);

  return (
    <ApprovalPopupContainer
      showAnimation={loading}
      hdType="wired"
      status={statusProp}
      onRetry={() => {
        setErrorMessage('');
        retry();
      }}
      onDone={onDone}
      onCancel={handleCancel}
      content={content}
      description={description}
    />
  );
};
