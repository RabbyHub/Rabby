import { hasConnectedLedgerDevice } from '@/utils';
import { Button, message, Tooltip } from 'antd';
import {
  SecurityCheckDecision,
  SecurityCheckResponse,
} from 'background/service/openapi';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import React, { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import { ReactComponent as IconQuestionMark } from 'ui/assets/question-mark.svg';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import { Modal } from 'ui/component';
import {
  hex2Text,
  openInternalPageInTab,
  useApproval,
  useWalletOld,
} from 'ui/utils';
import AccountCard from './AccountCard';
import LedgerWebHIDAlert from './LedgerWebHIDAlert';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';

import { getKRCategoryByType } from '@/utils/transaction';
import ReactGA from 'react-ga';
import PreCheckCard from './PreCheckCard';
import SecurityCheckCard from './SecurityCheckCard';
import ProcessTooltip from './ProcessTooltip';
import SecurityCheck from './SecurityCheck';

interface SignTextProps {
  data: string[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
  isGnosis?: boolean;
  account?: Account;
  method?: string;
}

export const WaitingSignComponent = {
  // [KEYRING_CLASS.HARDWARE.LEDGER]: 'HardwareWaiting',
  // [KEYRING_CLASS.WATCH]: 'WatchAdrressWaiting',
  [KEYRING_CLASS.WALLETCONNECT]: 'WatchAdrressWaiting',
  // [KEYRING_CLASS.GNOSIS]: 'GnosisWaiting',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'QRHardWareWaiting',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'LedgerHardwareWaiting',
};

const SignText = ({ params }: { params: SignTextProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWalletOld();
  const { t } = useTranslation();
  const { data, session, isGnosis = false } = params;
  const [hexData] = data;
  const signText = hex2Text(hexData);
  const [showSecurityCheckDetail, setShowSecurityCheckDetail] = useState(false);
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('pending');
  const [securityCheckAlert, setSecurityCheckAlert] = useState('Checking...');
  const [
    securityCheckDetail,
    setSecurityCheckDetail,
  ] = useState<SecurityCheckResponse | null>(null);
  const [explain, setExplain] = useState('');
  const [explainStatus, setExplainStatus] = useState<
    'unknown' | 'pass' | 'danger'
  >('unknown');
  const [submitText, setSubmitText] = useState('Proceed');
  const [checkText, setCheckText] = useState('Sign');
  const [isWatch, setIsWatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const [hasConnectedLedgerHID, setHasConnectedLedgerHID] = useState(false);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [forceProcess, setForceProcess] = useState(true);

  const handleSecurityCheck = async () => {
    setSecurityCheckStatus('loading');
    const currentAccount = await wallet.getCurrentAccount();
    const check = await wallet.openapi.checkText(
      isGnosis ? params.account!.address : currentAccount!.address,
      session.origin,
      hexData
    );

    const serverExplain = await wallet.openapi.explainText(
      session.origin,
      isGnosis ? params.account!.address : currentAccount!.address,
      hexData
    );

    setExplain(serverExplain.comment);
    setExplainStatus(serverExplain.status);
    setSecurityCheckStatus(check.decision);
    setSecurityCheckAlert(check.alert);
    setSecurityCheckDetail(check);
    setForceProcess(check.decision !== 'forbidden');
  };

  const report = async (
    action:
      | 'createSignText'
      | 'startSignText'
      | 'cancelSignText'
      | 'completeSignText',
    extra?: Record<string, any>
  ) => {
    const currentAccount = isGnosis
      ? params.account
      : await wallet.getCurrentAccount<Account>();
    if (!currentAccount) {
      return;
    }
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
      method: 'personalSign',
      ...extra,
    });
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
    if (isGnosis && params.account) {
      if (WaitingSignComponent[params.account.type]) {
        wallet.signPersonalMessage(
          params.account.type,
          params.account.address,
          params.data[0],
          {
            brandName: params.account.brandName,
          }
        );
        resolveApproval({
          uiRequestComponent: WaitingSignComponent[params.account.type],
          type: params.account.type,
          address: params.account.address,
          data: params.data,
          isGnosis: true,
          account: params.account,
        });
      } else {
        try {
          setIsLoading(true);
          const result = await wallet.signPersonalMessage(
            params.account.type,
            params.account.address,
            params.data[0]
          );
          report('completeSignText', {
            success: true,
          });
          const sigs = await wallet.getGnosisTransactionSignatures();
          if (sigs.length > 0) {
            await wallet.gnosisAddConfirmation(params.account.address, result);
          } else {
            await wallet.gnosisAddSignature(params.account.address, result);
            await wallet.postGnosisTransaction();
          }
          setIsLoading(false);
          resolveApproval(result, false, true);
        } catch (e) {
          message.error(e.message);
          setIsLoading(false);
          report('completeSignText', {
            success: false,
          });
        }
      }
      return;
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

  const handleViewRawClick = () => {
    Modal.info({
      title: t('Transaction detail'),
      centered: true,
      content: hexData,
      cancelText: null,
      okText: null,
      className: 'transaction-detail',
    });
  };

  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };

  const checkWachMode = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    const accountType =
      isGnosis && params.account ? params.account.type : currentAccount?.type;
    setIsLedger(accountType === KEYRING_CLASS.HARDWARE.LEDGER);
    setUseLedgerLive(await wallet.isUseLedgerLive());
    setHasConnectedLedgerHID(await hasConnectedLedgerDevice());
    if (accountType === KEYRING_TYPE.WatchAddressKeyring) {
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
    if (accountType === KEYRING_TYPE.GnosisKeyring && !params.account) {
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

  useEffect(() => {
    checkWachMode();
  }, []);

  useEffect(() => {
    (async () => {
      const currentAccount = await wallet.getCurrentAccount<Account>();
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

  useEffect(() => {
    report('createSignText');
  }, []);

  return (
    <>
      <AccountCard account={params.account} />
      <div className="approval-text">
        <p className="section-title">
          {t('Sign Text')}
          <span
            className="float-right text-12 cursor-pointer flex items-center view-raw"
            style={{ lineHeight: '16px !important' }}
            onClick={handleViewRawClick}
          >
            {t('View Raw')} <img src={IconArrowRight} />
          </span>
        </p>
        <div className="text-detail-wrapper">
          <div className="text-detail text-gray-subTitle">{signText}</div>
          {explain && (
            <p className={clsx('text-explain', explainStatus)}>
              {explain}
              <Tooltip
                placement="topRight"
                overlayClassName="text-explain-tooltip"
                title={t(
                  'This summary information is provide by DeBank OpenAPI'
                )}
              >
                <IconQuestionMark className="icon icon-question-mark"></IconQuestionMark>
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
      <footer className="approval-text__footer pb-[20px]">
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
              loading={isLoading}
              disabled={
                (isLedger && !useLedgerLive && !hasConnectedLedgerHID) ||
                !forceProcess
              }
            >
              {t(submitText)}
            </Button>
          )}
        </div>
      </footer>
    </>
  );
};

export default SignText;
