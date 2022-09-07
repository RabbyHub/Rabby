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
import LedgerWebHIDAlert from './LedgerWebHIDAlert';
import IconQuestionMark from 'ui/assets/question-mark-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import clsx from 'clsx';
import ReactGA from 'react-ga';
import { getKRCategoryByType } from '@/utils/transaction';
import { underline2Camelcase } from '@/background/utils';
import SecurityCheckCard from './SecurityCheckCard';
import ProcessTooltip from './ProcessTooltip';
import SecurityCheck from './SecurityCheck';
import { useLedgerDeviceConnected } from '@/utils/ledger';
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
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [submitText, setSubmitText] = useState('Proceed');
  const [checkText, setCheckText] = useState('Sign');
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [forceProcess, setForceProcess] = useState(true);

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

  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };

  const checkWachMode = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconWatch} alt="" className="w-[24px] flex-shrink-0" />
          <div>
            Unable to sign because the current address is in Watch Mode. You can{' '}
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
            fully or use another address.
          </div>
        </div>
      );
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
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
    setForceProcess(check.decision !== 'forbidden');
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
    })();
  }, [securityCheckStatus]);

  return (
    <>
      <AccountCard />
      <div className="approval-text">
        <p className="section-title">{t('Sign Typed Message')}</p>
        <div className="text-detail-wrapper">
          <div className="text-detail">{parsedMessage}</div>
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
        <div className="section-title mt-[32px]">Pre-sign check</div>
        <SecurityCheckCard
          isReady={true}
          loading={securityCheckStatus === 'loading'}
          data={securityCheckDetail}
          status={securityCheckStatus}
          onCheck={handleSecurityCheck}
        ></SecurityCheckCard>
      </div>

      <footer className="approval-text__footer">
        {isLedger && !useLedgerLive && !hasConnectedLedgerHID && (
          <LedgerWebHIDAlert connected={hasConnectedLedgerHID} />
        )}
        {isWatch ? (
          <ProcessTooltip>{cantProcessReason}</ProcessTooltip>
        ) : (
          <SecurityCheck
            status={securityCheckStatus}
            value={forceProcess}
            onChange={handleForceProcessChange}
          />
        )}
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
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow()}
              disabled={true}
            >
              {t('Sign')}
            </Button>
          ) : (
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              onClick={() => handleAllow(forceProcess)}
              disabled={
                (isLedger && !useLedgerLive && !hasConnectedLedgerHID) ||
                !forceProcess ||
                securityCheckStatus === 'loading'
              }
            >
              {submitText}
            </Button>
          )}
        </div>
      </footer>
    </>
  );
};

export default SignTypedData;
