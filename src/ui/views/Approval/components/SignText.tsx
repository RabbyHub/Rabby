import React, { useState, useEffect, ReactNode } from 'react';
import { Button, Tooltip, message } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import {
  useApproval,
  useWallet,
  hex2Text,
  openInternalPageInTab,
  useWalletOld,
} from 'ui/utils';
import {
  SecurityCheckResponse,
  SecurityCheckDecision,
} from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { Modal } from 'ui/component';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import AccountCard from './AccountCard';
import { hasConnectedLedgerDevice } from '@/utils';
import LedgerWebHIDAlert from './LedgerWebHIDAlert';
import { ReactComponent as IconQuestionMark } from 'ui/assets/question-mark.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconInfo from 'ui/assets/infoicon.svg';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';

interface SignTextProps {
  data: string[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
  isGnosis?: boolean;
  account?: Account;
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
        <div className="flex items-center gap-8">
          <img src={IconWatch} alt="" className="w-[24px]" />
          <div>
            The currrent address is in Watch Mode. If your want to continue,
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
    if (accountType === KEYRING_TYPE.GnosisKeyring && !params.account) {
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

  useEffect(() => {
    checkWachMode();
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
        <div className="text-detail-wrapper gray-section-block">
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
              loading={isLoading}
              disabled={isLedger && !useLedgerLive && !hasConnectedLedgerHID}
            >
              {t(submitText)}
            </Button>
          )}
        </div>
      </footer>
      {securityCheckDetail && (
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

export default SignText;
