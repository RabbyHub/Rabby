import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from 'antd';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';
import { StrayPage } from 'ui/component';
import { query2obj } from 'ui/utils/url';
import { useWallet } from 'ui/utils';
import { HARDWARE_KEYRING_TYPES, WALLET_BRAND_TYPES } from 'consts';
import IconSuccess from 'ui/assets/success-large.svg';
import { LedgerHDPathType as HDPathType } from '@/ui/utils/ledger';
const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;
import './style.less';
import { useKeystoneUSBErrorCatcher } from '@/ui/utils/keystone';
import { getImKeyFirstImKeyDevice } from '@/ui/utils/imKey';

const RequestPermission = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const qs = query2obj(window.location.href);
  const type = qs.type;
  const from = qs.from;
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const needConfirm = ['ledger', 'keystone', 'imkey'].includes(type);
  const [loading, setLoading] = useState(false);
  const keystoneErrorCatcher = useKeystoneUSBErrorCatcher();
  const isReconnect = !!qs.reconnect;

  const PERMISSIONS = {
    camera: {
      title: t('page.newAddress.ledger.cameraPermissionTitle'),
      desc: [t('page.newAddress.ledger.cameraPermission1')],
    },
    ledger: {
      title: t('page.newAddress.ledger.allowRabbyPermissionsTitle'),
      desc: [t('page.newAddress.ledger.ledgerPermission1')],
      tip: t('page.newAddress.ledger.ledgerPermissionTip'),
    },
    imkey: {
      title: t('page.newAddress.ledger.allowRabbyPermissionsTitle'),
      desc: [t('page.newAddress.ledger.ledgerPermission1')],
      tip: t('page.newAddress.ledger.ledgerPermissionTip'),
    },
    keystone: {
      title: t('page.newAddress.keystone.allowRabbyPermissionsTitle'),
      desc: [t('page.newAddress.keystone.keystonePermission1')],
      tip: t('page.newAddress.keystone.keystonePermissionTip'),
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
    if (type === 'imkey') {
      try {
        await getImKeyFirstImKeyDevice();
        await wallet.authorizeImKeyHIDPermission();
        if (isReconnect) {
          wallet.activeFirstApproval();
          window.close();
          return;
        }

        if (from && from === 'approval') {
          setShowSuccess(true);
          return;
        }
        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: HARDWARE_KEYRING_TYPES.ImKey.type,
          },
        });
      } catch (e) {
        console.error(e);
      }
    }
    if (type === 'keystone') {
      try {
        setLoading(true);
        await TransportWebUSB.requestPermission();

        if (isReconnect) {
          wallet.activeFirstApproval();
          window.close();
          return;
        }

        if (from && from === 'approval') {
          setShowSuccess(true);
          return;
        }

        await wallet.requestKeyring(KEYSTONE_TYPE, 'forgetDevice', null);

        const stashKeyringId = await wallet.initQRHardware(
          WALLET_BRAND_TYPES.KEYSTONE
        );

        await wallet.requestKeyring(
          KEYSTONE_TYPE,
          'getAddressesViaUSB',
          stashKeyringId,
          HDPathType.BIP44
        );

        let search = `?hd=${KEYSTONE_TYPE}&brand=${WALLET_BRAND_TYPES.KEYSTONE}`;
        if (stashKeyringId) {
          search += `&keyringId=${stashKeyringId}`;
        }

        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: KEYSTONE_TYPE,
            keyringId: stashKeyringId,
            brand: WALLET_BRAND_TYPES.KEYSTONE,
          },
          search,
        });
      } catch (error) {
        keystoneErrorCatcher(error);
      } finally {
        setLoading(false);
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
      spinning={loading}
      headerClassName="mb-28"
      className="request-permission-wrapper"
      backgroundClassName="bg-r-neutral-card-2"
    >
      {showSuccess ? (
        <div className="authorize-success">
          <img src={IconSuccess} className="icon icon-success" />
          <h1>{t('page.newAddress.ledger.permissionsAuthorized')}</h1>
          <p>
            {t('page.newAddress.ledger.nowYouCanReInitiateYourTransaction')}
          </p>
          <Button type="primary" size="large" onClick={() => window.close()}>
            {t('global.ok')}
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
                {t('page.newAddress.ledger.allow')}
              </Button>
            </div>
          )}
        </>
      )}
    </StrayPage>
  );
};

export default RequestPermission;
