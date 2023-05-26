import React from 'react';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { EVENTS, KEYRING_CLASS } from '@/constant';
import eventBus from '@/eventBus';

type Status =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ADDRESS_ERROR'
  | 'LOCKED'
  | undefined;

export const useLedgerStatus = (address?: string) => {
  const wallet = useWallet();
  const { activePopup } = useCommonPopupView();
  const [useLedgerLive, setUseLedgerLive] = React.useState(false);
  const [content, setContent] = React.useState<string>();
  const [description, setDescription] = React.useState<string>();
  const [status, setStatus] = React.useState<Status>('DISCONNECTED');

  React.useEffect(() => {
    wallet.isUseLedgerLive().then(setUseLedgerLive);
  }, []);

  React.useEffect(() => {
    if (useLedgerLive) {
      setStatus('CONNECTED');
    }
  }, [useLedgerLive]);

  const onClickConnect = () => {
    activePopup('Ledger');
  };

  React.useEffect(() => {
    switch (status) {
      case 'CONNECTED':
        setContent('Connected and ready to sign');
        break;

      case 'ADDRESS_ERROR':
        setContent('Connected but unable to sign');
        setDescription('The current address does not belong to this device');
        break;

      case 'LOCKED':
        setContent('Connected but unable to sign');
        setDescription('Please unlock your Ledger and open Ethereum App');
        break;

      case 'DISCONNECTED':
      case undefined:
      default:
        setContent('Ledger is not connected');
        break;
    }
  }, [status]);

  React.useEffect(() => {
    const handle = (payload) => {
      setStatus(payload);
    };

    eventBus.addEventListener(EVENTS.LEDGER.SESSION_CHANGE, handle);
    wallet
      .requestKeyring(KEYRING_CLASS.HARDWARE.LEDGER, 'getConnectStatus', null)
      .then((res) => {
        setStatus(res);
      });

    return () => {
      eventBus.removeEventListener(EVENTS.LEDGER.SESSION_CHANGE, handle);
    };
  }, []);

  React.useEffect(() => {
    if (status === 'CONNECTED') {
      wallet
        .requestKeyring(
          KEYRING_CLASS.HARDWARE.LEDGER,
          'verifyAddressInDevice',
          null,
          address
        )
        .then((valid) => {
          if (!valid) {
            setStatus('ADDRESS_ERROR');
          }
        });
    }
  }, [status, address]);

  return {
    content,
    description,
    onClickConnect,
    status,
  };
};
