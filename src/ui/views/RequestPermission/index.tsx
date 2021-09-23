import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { StrayPage } from 'ui/component';
import { query2obj } from 'ui/utils/url';

import './style.less';

const RequestPermission = () => {
  const type = query2obj(window.location.href).type;
  const { t } = useTranslation();
  const needConfirm = type === 'ledger';

  const PERMISSIONS = {
    camera: {
      title: t('CameraPermissionTitle'),
      desc: [t('CameraPermission1'), t('CameraPermission2')],
    },
    ledger: {
      title: t('AllowRabbyPermissionsTitle'),
      desc: [t('LedgerPermission1'), t('LedgerPermission2')],
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
        const transport = await TransportWebUSB.create();
        await transport.close();
        if (parent) {
          window.postMessage({ success: true }, '*');
        }
      } catch (e) {
        console.log(e);
        if (parent) {
          window.postMessage({ success: false }, '*');
        }
      }
    }
  };

  const handleCancel = () => {
    window.postMessage({ success: false }, '*');
  };

  useEffect(() => {
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
