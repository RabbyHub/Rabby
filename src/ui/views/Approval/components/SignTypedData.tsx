import React, { ReactNode, useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { WaitingSignComponent } from './SignText';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import {
  openInternalPageInTab,
  useApproval,
  useWallet,
  useWalletOld,
} from 'ui/utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import AccountCard from './AccountCard';
import { hasConnectedLedgerDevice } from '@/utils';
import LedgerWebHIDAlert from './LedgerWebHIDAlert';
import IconQuestionMark from 'ui/assets/question-mark-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import clsx from 'clsx';
import ReactGA from 'react-ga';
import { getKRCategoryByType } from '@/utils/transaction';
import { underline2Camelcase } from '@/background/utils';
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
  const wallet = useWalletOld();
  const [isWatch, setIsWatch] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const [hasConnectedLedgerHID, setHasConnectedLedgerHID] = useState(false);
  const [submitText, setSubmitText] = useState('Proceed');
  const [checkText, setCheckText] = useState('Sign');
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();

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

  const checkWachMode = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-8">
          <img src={IconWatch} alt="" className="w-[24px]" />
          <div>
            The current address is in Watch Mode. If your want to continue,
            please{' '}
            <a
              href=""
              className="underline"
              onClick={async (e) => {
                e.preventDefault();
                await rejectApproval('User rejected the request.', true);
                openInternalPageInTab('no-address');
              }}
            >
              import it
            </a>{' '}
            again using another mode.
          </div>
        </div>
      );
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-8">
          <img src={IconGnosis} alt="" className="w-[24px]" />
          {t(
            'This is a Gnosis Safe address, and it cannot be used to sign text.'
          )}
        </div>
      );
    }
  };

  const report = async (
    action:
      | 'createSignText'
      | 'startSignText'
      | 'cancelSignText'
      | 'completeSignText',
    extra?: Record<string, any>
  ) => {
    const currentAccount = await wallet.getCurrentAccount();
    ReactGA.event({
      category: 'SignText',
      action: action,
      label: [
        getKRCategoryByType(currentAccount.type),
        currentAccount.brandName,
      ].join('|'),
      transport: 'beacon',
    });
    await wallet.reportStats(action, {
      type: currentAccount.brandName,
      category: getKRCategoryByType(currentAccount.type),
      method: underline2Camelcase(params.method),
      ...extra,
    });
  };

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();

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
    report('cancelSignText');
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
    report('startSignText');
    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      try {
        const transport = await TransportWebHID.create();
        await transport.close();
      } catch (e) {
        // ignore transport create error when ledger is not connected, it works but idk why
        console.log(e);
      }
    }
    if (currentAccount?.type && WaitingSignComponent[currentAccount?.type]) {
      resolveApproval({
        uiRequestComponent: WaitingSignComponent[currentAccount?.type],
        type: currentAccount.type,
        address: currentAccount.address,
        extra: {
          brandName: currentAccount.brandName,
        },
      });

      return;
    }

    resolveApproval({});
  };

  const init = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
    setUseLedgerLive(await wallet.isUseLedgerLive());
    setHasConnectedLedgerHID(await hasConnectedLedgerDevice());
  };

  useEffect(() => {
    init();
    checkWachMode();
    report('createSignText');
  }, []);

  useEffect(() => {
    (async () => {
      const currentAccount = await wallet.getCurrentAccount();
      if (
        [
          KEYRING_CLASS.MNEMONIC,
          KEYRING_CLASS.PRIVATE_KEY,
          KEYRING_CLASS.WATCH,
        ].includes(currentAccount.type)
      ) {
        setSubmitText('Sign');
        setCheckText('Sign');
      } else {
        setSubmitText('Proceed');
        setCheckText('Proceed');
      }
      if (['danger', 'forbidden'].includes(securityCheckStatus)) {
        setSubmitText('Continue');
      }
    })();
  }, [securityCheckStatus]);

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
                placement="topRight"
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
      <footer className="approval-text__footer">
        {isLedger && !useLedgerLive && !hasConnectedLedgerHID && (
          <LedgerWebHIDAlert connected={hasConnectedLedgerHID} />
        )}
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
              placement="topRight"
              overlayClassName={clsx(
                'rectangle watcSign__tooltip',
                'watcSign__tooltip-Sign'
              )}
              title={cantProcessReason}
            >
              <div className="w-[172px] relative flex items-center">
                <Button
                  type="primary"
                  size="large"
                  className="w-[172px]"
                  onClick={() => handleAllow()}
                  disabled={true}
                >
                  {t('Sign')}
                </Button>
                <img
                  src={IconInfo}
                  className={clsx('absolute right-[40px]', 'icon-submit-Sign')}
                />
              </div>
            </Tooltip>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow()}
              disabled={isLedger && !useLedgerLive && !hasConnectedLedgerHID}
            >
              {submitText}
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
          okText={t(checkText)}
          cancelText={t('Cancel')}
        />
      )}
    </>
  );
};

export default SignTypedData;
