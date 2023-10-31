import { useMemo } from 'react';
import { KeystoneDone } from '../KeystoneDone';
import { KeystoneReceived } from '../KeystoneReceived';
import { KeystoneSign } from '../KeystoneSign';
import { KeystoneSync } from '../KeystoneSync';

export enum SIGNATURE_METHOD {
  QRCODE,
  USB,
}

enum QRHARDWARE_STATUS {
  SYNC,
  SIGN,
  RECEIVED,
  DONE,
}

export const useSwitchSignatureByKeystone = (
  status,
  method: SIGNATURE_METHOD
) => {
  const SignComponent = useMemo(() => {
    const isUSBMethod = method === SIGNATURE_METHOD.USB;
    if (!isUSBMethod) return null;

    const SignComponentMapper = {
      [QRHARDWARE_STATUS.SYNC]: KeystoneSync,
      [QRHARDWARE_STATUS.SIGN]: KeystoneSign,
      [QRHARDWARE_STATUS.RECEIVED]: KeystoneReceived,
      [QRHARDWARE_STATUS.DONE]: KeystoneDone,
    };
    return SignComponentMapper[status];
  }, [method, status]);

  return SignComponent;
};
