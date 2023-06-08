import { underline2Camelcase } from '@/background/utils';
import { useLedgerDeviceConnected } from '@/utils/ledger';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import { CHAINS_LIST } from '@debank/common';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { Skeleton, message } from 'antd';
import {
  SecurityCheckDecision,
  SecurityCheckResponse,
} from 'background/service/openapi';
import { KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import SecurityCheck from './SecurityCheck';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { WaitingSignComponent } from './SignText';
import ViewRawModal from './TxComponents/ViewRawModal';
import { Account } from '@/background/service/preference';
import { adjustV } from '@/ui/utils/gnosis';
import { FooterBar } from './FooterBar/FooterBar';
import { parseSignTypedDataMessage } from './SignTypedDataExplain/parseSignTypedDataMessage';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import { parseAction } from './TypedDataActions/utils';

interface SignTypedDataProps {
  method: string;
  data: any[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
  isGnosis?: boolean;
  account?: Account;
}

const SignTypedData = ({ params }: { params: SignTypedDataProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isWatch, setIsWatch] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [submitText, setSubmitText] = useState('Proceed');
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [forceProcess, setForceProcess] = useState(true);

  const { data, session, method, isGnosis, account } = params;
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
      _message = parseSignTypedDataMessage(data[1]);
    }

    parsedMessage = JSON.stringify(_message, null, 4);
  } catch (err) {
    console.log('parse message error', parsedMessage);
  }

  const isSignTypedDataV1 = useMemo(
    () => /^eth_signTypedData(_v1)?$/.test(method),
    [method]
  );

  const signTypedData: null | Record<string, any> = useMemo(() => {
    if (!isSignTypedDataV1) {
      try {
        const v = JSON.parse(data[1]);
        return v;
      } catch (error) {
        console.error('parse signTypedData error: ', error);
        return null;
      }
    }
    return null;
  }, [data, isSignTypedDataV1]);

  const chain = useMemo(() => {
    if (!isSignTypedDataV1 && signTypedData) {
      let chainId;
      try {
        chainId = signTypedData?.domain?.chainId;
      } catch (error) {
        console.error(error);
      }
      if (chainId) {
        return CHAINS_LIST.find((e) => e.id + '' === chainId + '');
      }
    }

    return undefined;
  }, [data, isSignTypedDataV1, signTypedData]);

  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>(
    isSignTypedDataV1 ? 'pending' : 'loading'
  );

  const { value: typedDataActionData, loading, error } = useAsync(async () => {
    if (!isSignTypedDataV1 && signTypedData) {
      const currentAccount = isGnosis
        ? account
        : await wallet.getCurrentAccount();

      return await wallet.openapi.parseTypedData({
        typedData: signTypedData,
        address: currentAccount!.address,
        origin: session.origin,
      });
    }
    return;
  }, [data, isSignTypedDataV1, signTypedData]);

  if (error) {
    console.error('error', error);
  }

  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };

  const checkWachMode = async () => {
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    if (
      currentAccount &&
      currentAccount.type === KEYRING_TYPE.WatchAddressKeyring
    ) {
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
    if (currentAccount && currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
          {t('This is a Safe address, and it cannot be used to sign text.')}
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
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    if (currentAccount) {
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
        method: underline2Camelcase(params.method),
        ...extra,
      });
    }
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
      return;
    }
    if (activeApprovalPopup()) {
      return;
    }
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    if (isGnosis && params.account) {
      if (WaitingSignComponent[params.account.type]) {
        wallet.signTypedData(
          params.account.type,
          params.account.address,
          JSON.parse(params.data[1]),
          {
            brandName: params.account.brandName,
            version: 'V4',
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
          let result = await wallet.signTypedData(
            params.account.type,
            params.account.address,
            JSON.parse(params.data[1]),
            {
              version: 'V4',
            }
          );
          result = adjustV('eth_signTypedData', result);
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
          signTextMethod: underline2Camelcase(params.method),
        },
      });

      return;
    }
    report('startSignText');
    resolveApproval({});
  };

  const init = async () => {
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
    setUseLedgerLive(await wallet.isUseLedgerLive());
  };

  useEffect(() => {
    if (!loading && typedDataActionData) {
      parseAction(typedDataActionData, signTypedData);
    }
  }, [loading, typedDataActionData, signTypedData]);

  useEffect(() => {
    init();
    checkWachMode();
    report('createSignText');
  }, []);

  const handleViewRawClick = () => {
    ViewRawModal.open({
      raw: isSignTypedDataV1 ? data[0] : signTypedData || data[1],
    });
  };

  useEffect(() => {
    (async () => {
      const currentAccount = isGnosis
        ? account
        : await wallet.getCurrentAccount();
      if (
        currentAccount &&
        [
          KEYRING_CLASS.MNEMONIC,
          KEYRING_CLASS.PRIVATE_KEY,
          KEYRING_CLASS.WATCH,
        ].includes(currentAccount.type)
      ) {
        setSubmitText('Sign');
      } else {
        setSubmitText('Proceed');
      }
    })();
  }, [securityCheckStatus]);

  return (
    <>
      <div
        className="approval-text"
        style={{
          paddingBottom: '210px',
        }}
      >
        <p className="section-title">
          Sign {chain ? chain.name : ''} Typed Message
          <span
            className="float-right text-12 cursor-pointer flex items-center view-raw text-gray-content"
            onClick={handleViewRawClick}
          >
            {t('View Raw')} <img src={IconArrowRight} />
          </span>
        </p>
        {loading && (
          <Skeleton.Input
            active
            style={{
              width: 358,
              height: 400,
            }}
          />
        )}
        {/* <SignTypedDataExplain
          data={explainTypedDataRes}
          chain={chain}
          message={
            <div
              className={clsx(
                'text-detail-wrapper',
                loading && 'hidden',
                !isSignTypedDataV1 && 'pb-0',
                'h-full'
              )}
            >
              <div
                className={clsx(
                  'text-detail text-15 leading-[16px] font-medium',
                  'h-full'
                )}
                style={{
                  fontFamily: 'Roboto Mono',
                  color: '#13141A',
                }}
              >
                {parsedMessage}
              </div>
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
          }
        /> */}
      </div>

      <footer className="approval-text__footer">
        <SecurityCheck
          status={securityCheckStatus}
          value={forceProcess}
          onChange={handleForceProcessChange}
        />
        <FooterBar
          origin={params.session.origin}
          originLogo={params.session.icon}
          gnosisAccount={isGnosis ? account : undefined}
          onCancel={handleCancel}
          onSubmit={() => handleAllow(forceProcess)}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          disabledProcess={
            loading ||
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

export default SignTypedData;
