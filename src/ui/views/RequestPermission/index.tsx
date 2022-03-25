import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrayPage } from 'ui/component';
import { query2obj } from 'ui/utils/url';
import { HARDWARE_KEYRING_TYPES } from 'consts';

import './style.less';

const RequestPermission = () => {
  console.log('hello');
  const type = query2obj(window.location.href).type;
  console.log('type', type);
  const { t } = useTranslation();
  const history = useHistory();
  const needConfirm = type === 'ledger';

  const PERMISSIONS = {
    camera: {
      title: t('CameraPermissionTitle'),
      desc: [t('CameraPermission1'), t('CameraPermission2')],
    },
    ledger: {
      title: t('AllowRabbyPermissionsTitle'),
      desc: [t('LedgerPermission1'), t('LedgerPermission2')],
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
    console.log('needCofnirm', needConfirm);
    !needConfirm && init();
  }, []);

  return (
    <StrayPage
      header={{
        title: PERMISSIONS[type].title,
        center: true,
      }}
      headerClassName="mb-28"
      className="request-permission-wrapper"
    >
      <ul className="request-permission">
        {PERMISSIONS[type].desc.map((content, index) => {
          return (
            <li key={index}>
              {index + 1}. {content}
            </li>
          );
        })}
      </ul>
      {PERMISSIONS[type].tip && (
        <p className="permission-tip">{PERMISSIONS[type].tip}</p>
      )}
      {needConfirm && (
        <div className="btn-footer">
          <Button size="large" onClick={handleCancel}>
            {t('Cancel')}
          </Button>
          <Button type="primary" size="large" onClick={init}>
            {t('Allow')}
          </Button>
        </div>
      )}
    </StrayPage>
  );
};

export default RequestPermission;
