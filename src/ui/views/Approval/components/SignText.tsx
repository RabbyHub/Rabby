import { Button, message } from 'antd';
import {
  SecurityCheckDecision,
  SecurityCheckResponse,
} from 'background/service/openapi';
import { Account } from 'background/service/preference';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import React, { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconArrowRight from 'ui/assets/approval/edit-arrow-right.svg';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import { Modal } from 'ui/component';
import {
  hex2Text,
  openInternalPageInTab,
  useApproval,
  useCommonPopupView,
  useWallet,
} from 'ui/utils';
import AccountCard from './AccountCard';
import LedgerWebHIDAlert from './LedgerWebHIDAlert';

import { getKRCategoryByType } from '@/utils/transaction';
import { matomoRequestEvent } from '@/utils/matomo-request';
import SecurityCheckCard from './SecurityCheckCard';
import ProcessTooltip from './ProcessTooltip';
import SecurityCheck from './SecurityCheck';
import { useLedgerDeviceConnected } from '@/utils/ledger';
import {
  checkSIWEAddress,
  checkSIWEDomain,
  detectSIWE,
  genSecurityCheckMessage,
} from 'ui/utils/siwe';
import { FooterBar } from './FooterBar/FooterBar';

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
  // [KEYRING_CLASS.WATCH]: 'WatchAddressWaiting',
  [KEYRING_CLASS.WALLETCONNECT]: 'WatchAddressWaiting',
  // [KEYRING_CLASS.GNOSIS]: 'GnosisWaiting',
  [KEYRING_CLASS.HARDWARE.KEYSTONE]: 'QRHardWareWaiting',
  [KEYRING_CLASS.HARDWARE.LEDGER]: 'LedgerHardwareWaiting',
  [KEYRING_CLASS.HARDWARE.GRIDPLUS]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.ONEKEY]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.TREZOR]: 'CommonWaiting',
  [KEYRING_CLASS.HARDWARE.BITBOX02]: 'CommonWaiting',
};

const SignText = ({ params }: { params: SignTextProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
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
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [forceProcess, setForceProcess] = useState(true);
  const [title, setTitle] = useState('Sign Text');
  const swie = detectSIWE(signText);

  const handleSWIECheck = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    const address = isGnosis
      ? params.account!.address
      : currentAccount!.address;
    const origin = session.origin;

    if (!checkSIWEAddress(address, swie.parsedMessage!)) {
      setSecurityCheckStatus('warning');
      setSecurityCheckDetail(
        genSecurityCheckMessage({
          alert:
            'The address in the signature does not match the address you are using.',
          status: 'warning',
        })
      );
    }
    if (!checkSIWEDomain(origin, swie.parsedMessage!)) {
      setForceProcess(false);
      setSecurityCheckStatus('forbidden');
      setSecurityCheckDetail(
        genSecurityCheckMessage({
          alert:
            'The domain in the signature does not match the current site, which may be a phishing site',
          status: 'forbidden',
        })
      );
    }
  };

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
    // TODO: check if the 'status' in serverExplain
    setExplainStatus((serverExplain as any).status);
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
    matomoRequestEvent({
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

  const { activeApprovalPopup } = useCommonPopupView();
  const handleAllow = async (doubleCheck = false) => {
    if (
      !doubleCheck &&
      securityCheckStatus !== 'pass' &&
      securityCheckStatus !== 'pending'
    ) {
      setShowSecurityCheckDetail(true);

      return;
    }
    if (activeApprovalPopup()) {
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
          signTextMethod: 'personalSign',
        },
      });

      return;
    }
    report('startSignText');
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
    if (accountType === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        // <div className="flex items-center gap-6">
        //   <img src={IconWatch} alt="" className="w-[24px] flex-shrink-0" />
        //   <div>
        //     Unable to sign because the current address is a Watch-only Address
        //     from Contacts. You can{' '}
        //     <a
        //       href=""
        //       className="underline"
        //       onClick={async (e) => {
        //         e.preventDefault();
        //         await rejectApproval('User rejected the request.', true);
        //         openInternalPageInTab('no-address');
        //       }}
        //     >
        //       import it
        //     </a>{' '}
        //     fully or use another address.
        //   </div>
        // </div>
        <div>You can only use imported addresses to sign</div>
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

    if (swie.isSIWEMessage) {
      setTitle('Sign-In with Ethereum');
      handleSWIECheck();
    }
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
      <div className="approval-text">
        <p className="section-title">
          {title}
          <span
            className="float-right text-12 cursor-pointer flex items-center view-raw"
            style={{ lineHeight: '16px !important' }}
            onClick={handleViewRawClick}
          >
            {t('View Raw')} <img src={IconArrowRight} />
          </span>
        </p>
        <div className="text-detail-wrapper">
          <div className="text-detail">{signText}</div>
          {/* {explain && (
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
          )} */}
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
        <SecurityCheck
          status={securityCheckStatus}
          value={forceProcess}
          onChange={handleForceProcessChange}
        />

        <FooterBar
          gnosisAccount={isGnosis ? params.account : undefined}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          onCancel={handleCancel}
          onSubmit={() => handleAllow(forceProcess)}
          disabledProcess={
            (isLedger && !useLedgerLive && !hasConnectedLedgerHID) ||
            !forceProcess ||
            securityCheckStatus === 'loading' ||
            isWatch
          }
        />
      </footer>
    </>
  );
};

export default SignText;
