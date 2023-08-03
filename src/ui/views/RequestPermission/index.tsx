import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPage } from 'ui/component';
import { query2obj } from 'ui/utils/url';
import { useWallet } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES } from 'consts';
import IconSuccess from 'ui/assets/success-large.svg';

import './style.less';

const RequestPermission = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const qs = query2obj(window.location.href);
  const type = qs.type;
  const from = qs.from;
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const needConfirm = type === 'ledger';
  const isReconnect = !!qs.reconnect;

  const PERMISSIONS = {
    camera: {
      title: t('CameraPermissionTitle'),
      desc: [t('CameraPermission1')],
    },
    ledger: {
      title: t('AllowRabbyPermissionsTitle'),
      desc: [t('LedgerPermission1')],
      tip: t('LedgerPermissionTip'),
    },
  };

  const init = async () => {
    if (type === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        window.close();
      });
    }
    if (type === 'ledger') {
      const parent = window.opener;
      try {
        const transport = await TransportWebHID.create();
        await transport.close();
        await wallet.authorizeLedgerHIDPermission();
        if (isReconnect) {
          wallet.activeFirstApproval();
          window.close();
          return;
        }

        if (from && from === 'approval') {
          setShowSuccess(true);
          return;
        }
        if (parent) {
          window.postMessage({ success: true }, '*');
        } else {
          history.push({
            pathname: '/import/select-address',
            state: {
              keyring: HARDWARE_KEYRING_TYPES.Ledger.type,
              isWebHID: true,
              ledgerLive: false,
            },
          });
        }
      } catch (e) {
        if (parent) {
          window.postMessage({ success: false }, '*');
        }
      }
    }
  };

  const handleCancel = () => {
    if (window.opener) {
      window.postMessage({ success: false }, '*');
    } else {
      history.goBack();
    }
  };

  useEffect(() => {
    !needConfirm && init();
  }, []);

  return (
    <StrayPage
      header={
        showSuccess
          ? undefined
          : {
              title: PERMISSIONS[type].title,
              center: true,
            }
      }
      headerClassName="mb-28"
      className="request-permission-wrapper"
    >
      {showSuccess ? (
        <div className="authorize-success">
          <img src={IconSuccess} className="icon icon-success" />
          <h1>Permissions Authorized</h1>
          <p>Now you can re-initiate your transaction.</p>
          <Button type="primary" size="large" onClick={() => window.close()}>
            {t('OK')}
          </Button>
        </div>
      ) : (
        <>
          <ul className="request-permission">
            {PERMISSIONS[type].desc.map((content, index) => {
              return <li key={index}>· {content}</li>;
            })}
          </ul>
          {PERMISSIONS[type].tip && (
            <p className="permission-tip">{PERMISSIONS[type].tip}</p>
          )}
          {needConfirm && (
            <div className="btn-footer">
              <Button type="primary" size="large" onClick={init}>
                {t('Allow')}
              </Button>
            </div>
          )}
        </>
      )}
    </StrayPage>
  );
};

export default RequestPermission;
