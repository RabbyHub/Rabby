import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StrayPage } from 'ui/component';
import { query2obj } from 'ui/utils/url';

import './style.less';

const RequestPermission = () => {
  const type = query2obj(window.location.href).type;
  const { t } = useTranslation();

  const PERMISSIONS = {
    camera: {
      title: t('CameraPermissionTitle'),
      desc: [t('CameraPermission1'), t('CameraPermission2')],
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
  };

  useEffect(() => {
    init();
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
    </StrayPage>
  );
};

export default RequestPermission;
