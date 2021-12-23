import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import { WaitingSignComponent } from './SignText';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import { useApproval, useWallet } from 'ui/utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import AccountCard from './AccountCard';
import IconQuestionMark from 'ui/assets/question-mark-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
interface SignTypedDataProps {
  method: string;
  data: any[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const SignTypedData = ({ params }: { params: SignTypedDataProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isWatch, setIsWatch] = useState(false);
  const { data, session, method } = params;
  let parsedMessage = '';
  let _message = '';
  try {
    // signTypeDataV1 [Message, from]
    if (/^eth_signTypedData(_v1)?$/.test(method)) {
      _message = data[0].reduce((m, n) => {
        m[n.name] = n.value;
        return m;
      }, {});
    } else {
      // [from, Message]
      _message = JSON.parse(data[1])?.message;
    }

    parsedMessage = JSON.stringify(_message, null, 4);
  } catch (err) {
    console.log('parse message error', parsedMessage);
  }

  const [showSecurityCheckDetail, setShowSecurityCheckDetail] = useState(false);
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('pending');
  const [securityCheckAlert, setSecurityCheckAlert] = useState(
    t<string>('Checking')
  );
  const [
    securityCheckDetail,
    setSecurityCheckDetail,
  ] = useState<SecurityCheckResponse | null>(null);
  const [explain, setExplain] = useState('');

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsWatch(true);
    }
    const dataStr = JSON.stringify(data);
    const check = await wallet.openapi.checkText(
      currentAccount!.address,
      session.origin,
      dataStr
    );
    const serverExplain = await wallet.openapi.explainText(
      session.origin,
      currentAccount!.address,
      dataStr
    );
    setExplain(serverExplain.comment);
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    setSecurityCheckDetail(check);
  };

  const handleCancel = () => {
    rejectApproval('User rejected the request.');
  };

  const handleAllow = async (doubleCheck = false) => {
    if (
      !doubleCheck &&
      securityCheckStatus !== 'pass' &&
      securityCheckStatus !== 'pending'
    ) {
      setShowSecurityCheckDetail(true);

      return;
    }
    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      try {
        const keyring = await wallet.connectHardware(
          KEYRING_CLASS.HARDWARE.LEDGER
        );
        if (keyring.isWebUSB) {
          const transport = await TransportWebUSB.create();
          await transport.close();
        }
      } catch (e) {
        // NOTHING
      }
    }
    if (currentAccount?.type && WaitingSignComponent[currentAccount?.type]) {
      resolveApproval({
        uiRequestComponent: WaitingSignComponent[currentAccount?.type],
        type: currentAccount.type,
        address: currentAccount.address,
      });

      return;
    }

    resolveApproval({});
  };

  return (
    <>
      <AccountCard />
      <div className="approval-text">
        <p className="section-title">{t('Sign Typed Message')}</p>
        <div className="text-detail-wrapper gray-section-block">
          <div className="text-detail text-gray-subTitle">{parsedMessage}</div>
          {explain && (
            <p className="text-explain">
              {explain}
              <Tooltip
                placement="top"
                overlayClassName="text-explain-tooltip"
                title={t(
                  'This summary information is provide by DeBank OpenAPI'
                )}
              >
                <img
                  src={IconQuestionMark}
                  className="icon icon-question-mark"
                />
              </Tooltip>
            </p>
          )}
        </div>
      </div>
      <footer>
        <SecurityCheckBar
          status={securityCheckStatus}
          alert={securityCheckAlert}
          onClick={() => setShowSecurityCheckDetail(true)}
          onCheck={handleSecurityCheck}
        />
        <div className="action-buttons flex justify-between">
          <Button
            type="primary"
            size="large"
            className="w-[172px]"
            onClick={handleCancel}
          >
            {t('Cancel')}
          </Button>
          {isWatch ? (
            <Tooltip
              overlayClassName="rectangle watcSign__tooltip"
              title={t('Use_other_methods')}
            >
              <div className="w-[172px] relative flex items-center">
                <Button
                  type="primary"
                  size="large"
                  className="w-[172px]"
                  onClick={() => handleAllow()}
                  disabled={true}
                >
                  {t('Proceed')}
                </Button>
                <img src={IconInfo} className="absolute right-[40px]" />
              </div>
            </Tooltip>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow()}
            >
              {securityCheckStatus === 'pass' ||
              securityCheckStatus === 'pending'
                ? t('Sign')
                : t('Continue')}{' '}
            </Button>
          )}
        </div>
      </footer>
      {securityCheckDetail && !isWatch && (
        <SecurityCheckDetail
          visible={showSecurityCheckDetail}
          onCancel={() => setShowSecurityCheckDetail(false)}
          data={securityCheckDetail}
          onOk={() => handleAllow(true)}
          okText={t('Sign')}
          cancelText={t('Cancel')}
        />
      )}
    </>
  );
};

export default SignTypedData;
