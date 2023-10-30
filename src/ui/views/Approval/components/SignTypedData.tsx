import React, { ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import { CHAINS_LIST } from '@debank/common';
import { Result } from '@rabby-wallet/rabby-security-engine';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { Skeleton, message } from 'antd';
import { useScroll } from 'react-use';
import { useSize } from 'ahooks';
import { underline2Camelcase } from '@/background/utils';
import { useLedgerDeviceConnected } from '@/utils/ledger';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import {
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
  KEYRING_TYPE,
  CHAINS,
  REJECT_SIGN_TEXT_KEYRINGS,
} from 'consts';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { WaitingSignMessageComponent } from './map';
import { Account } from '@/background/service/preference';
import { adjustV } from '@/ui/utils/gnosis';
import { FooterBar } from './FooterBar/FooterBar';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { parseSignTypedDataMessage } from './SignTypedDataExplain/parseSignTypedDataMessage';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import Actions from './TypedDataActions';
import {
  parseAction,
  fetchRequireData,
  TypedDataRequireData,
  TypedDataActionData,
  formatSecurityEngineCtx,
} from './TypedDataActions/utils';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { isTestnetChainId } from '@/utils/chain';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { useSignPermissionCheck } from '../hooks/useSignPermissionCheck';
import { useTestnetCheck } from '../hooks/useTestnetCheck';

interface SignTypedDataProps {
  method: string;
  data: any[];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
  isGnosis?: boolean;
  isSend?: boolean;
  account?: Account;
}

const SignTypedData = ({ params }: { params: SignTypedDataProps }) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const [isLoading, setIsLoading] = useState(true);
  const [isWatch, setIsWatch] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const [footerShowShadow, setFooterShowShadow] = useState(false);
  const { executeEngine } = useSecurityEngine();
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const dispatch = useRabbyDispatch();
  const { userData, rules, currentTx, tokenDetail } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
    tokenDetail: s.sign.tokenDetail,
  }));
  const [currentChainId, setCurrentChainId] = useState<
    number | string | undefined
  >(undefined);

  useSignPermissionCheck({
    origin: params.session.origin,
    chainId: currentChainId,
    onOk: () => {
      handleCancel();
    },
    onDisconnect: () => {
      handleCancel();
    },
  });

  useTestnetCheck({
    chainId: currentChainId,
    onOk: () => {
      handleCancel();
    },
  });
  const [
    actionRequireData,
    setActionRequireData,
  ] = useState<TypedDataRequireData>(null);
  const [
    parsedActionData,
    setParsedActionData,
  ] = useState<TypedDataActionData | null>(null);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const securityLevel = useMemo(() => {
    const enableResults = engineResults.filter((result) => {
      return result.enable && !currentTx.processedRules.includes(result.id);
    });
    if (enableResults.some((result) => result.level === Level.FORBIDDEN))
      return Level.FORBIDDEN;
    if (enableResults.some((result) => result.level === Level.DANGER))
      return Level.DANGER;
    if (enableResults.some((result) => result.level === Level.WARNING))
      return Level.WARNING;
    return undefined;
  }, [engineResults, currentTx]);
  const hasUnProcessSecurityResult = useMemo(() => {
    const { processedRules } = currentTx;
    const enableResults = engineResults.filter((item) => item.enable);
    // const hasForbidden = enableResults.find(
    //   (result) => result.level === Level.FORBIDDEN
    // );
    const hasSafe = !!enableResults.find(
      (result) => result.level === Level.SAFE
    );
    const needProcess = enableResults.filter(
      (result) =>
        (result.level === Level.DANGER ||
          result.level === Level.WARNING ||
          result.level === Level.FORBIDDEN) &&
        !processedRules.includes(result.id)
    );
    // if (hasForbidden) return true;
    if (needProcess.length > 0) {
      return !hasSafe;
    } else {
      return false;
    }
  }, [engineResults, currentTx]);

  const { data, session, method, isGnosis, isSend, account } = params;
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

  const getCurrentChainId = async () => {
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      const site = await wallet.getConnectedSite(params.session.origin);
      if (site) {
        return CHAINS[site.chain].id;
      }
    } else {
      return chain?.id;
    }
  };
  useEffect(() => {
    getCurrentChainId().then((id) => {
      setCurrentChainId(id);
    });
  }, [params.session.origin]);

  const { value: typedDataActionData, loading, error } = useAsync(async () => {
    if (!isSignTypedDataV1 && signTypedData) {
      const currentAccount = isGnosis
        ? account
        : await wallet.getCurrentAccount();
      const chainId = signTypedData?.domain?.chainId;
      const apiProvider = isTestnetChainId(chainId)
        ? wallet.testnetOpenapi
        : wallet.openapi;
      return await apiProvider.parseTypedData({
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
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
    if (currentAccount && currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
          {t('page.signTypedData.safeCantSignText')}
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

  const handleAllow = async () => {
    if (activeApprovalPopup()) {
      return;
    }
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    if (isGnosis && params.account) {
      if (WaitingSignMessageComponent[params.account.type]) {
        wallet.signTypedData(
          params.account.type,
          params.account.address,
          JSON.parse(params.data[1]),
          {
            brandName: params.account.brandName,
            version: 'V4',
          }
        );
        if (isSend) {
          wallet.clearPageStateCache();
        }
        resolveApproval({
          uiRequestComponent: WaitingSignMessageComponent[params.account.type],
          type: params.account.type,
          address: params.account.address,
          data: params.data,
          isGnosis: true,
          account: params.account,
        });
      } else {
        try {
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
          if (isSend) {
            wallet.clearPageStateCache();
          }
          resolveApproval(result, false, true);
        } catch (e) {
          message.error(e.message);
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
    if (
      currentAccount?.type &&
      WaitingSignMessageComponent[currentAccount?.type]
    ) {
      resolveApproval({
        uiRequestComponent: WaitingSignMessageComponent[currentAccount?.type],
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
    if (
      currentAccount?.type &&
      REJECT_SIGN_TEXT_KEYRINGS.includes(currentAccount.type)
    ) {
      rejectApproval('This address can not sign text message', false, true);
    }
    setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
    setUseLedgerLive(await wallet.isUseLedgerLive());
  };

  const getRequireData = async (data: TypedDataActionData) => {
    const currentAccount = isGnosis
      ? account
      : await wallet.getCurrentAccount();
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      const site = await wallet.getConnectedSite(params.session.origin);
      if (site) {
        data.chainId = CHAINS[site.chain].id.toString();
      }
    }
    if (currentAccount) {
      const requireData = await fetchRequireData(
        data,
        currentAccount.address,
        wallet
      );
      setActionRequireData(requireData);
      const ctx = await formatSecurityEngineCtx({
        actionData: data,
        requireData,
        wallet,
      });
      const result = await executeEngine(ctx);
      setEngineResults(result);
    }
    setIsLoading(false);
  };

  const executeSecurityEngine = async () => {
    const ctx = await formatSecurityEngineCtx({
      actionData: parsedActionData!,
      requireData: actionRequireData,
      wallet,
    });
    const result = await executeEngine(ctx);
    setEngineResults(result);
  };

  const handleIgnoreAllRules = () => {
    dispatch.securityEngine.processAllRules(
      engineResults.map((result) => result.id)
    );
  };

  const handleIgnoreRule = (id: string) => {
    dispatch.securityEngine.processRule(id);
    dispatch.securityEngine.closeRuleDrawer();
  };

  const handleUndoIgnore = (id: string) => {
    dispatch.securityEngine.unProcessRule(id);
    dispatch.securityEngine.closeRuleDrawer();
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    if (currentTx.processedRules.includes(id)) {
      dispatch.securityEngine.unProcessRule(id);
    }
    await wallet.ruleEnableStatusChange(id, value);
    dispatch.securityEngine.init();
  };

  const handleRuleDrawerClose = (update: boolean) => {
    if (update) {
      executeSecurityEngine();
    }
    dispatch.securityEngine.closeRuleDrawer();
  };

  useEffect(() => {
    executeSecurityEngine();
  }, [rules]);

  useEffect(() => {
    const sender = isSignTypedDataV1 ? params.data[1] : params.data[0];
    if (!loading) {
      if (typedDataActionData) {
        const parsed = parseAction(typedDataActionData, signTypedData, sender);
        setParsedActionData(parsed);
        getRequireData(parsed);
      } else {
        setIsLoading(false);
      }
    }
  }, [loading, typedDataActionData, signTypedData, params, isSignTypedDataV1]);

  useEffect(() => {
    if (scrollRef.current && scrollInfo && scrollRefSize) {
      const avaliableHeight =
        scrollRef.current.scrollHeight - scrollRefSize.height;
      if (avaliableHeight <= 0) {
        setFooterShowShadow(false);
      } else {
        setFooterShowShadow(avaliableHeight - 20 > scrollInfo.y);
      }
    }
  }, [scrollInfo, scrollRefSize]);

  useEffect(() => {
    init();
    checkWachMode();
    report('createSignText');
  }, []);

  return (
    <>
      <div className="approval-text">
        {isLoading && (
          <Skeleton.Input
            active
            style={{
              width: 358,
              height: 400,
            }}
          />
        )}
        {!isLoading && (
          <Actions
            data={parsedActionData}
            requireData={actionRequireData}
            chain={chain}
            engineResults={engineResults}
            raw={isSignTypedDataV1 ? data[0] : signTypedData || data[1]}
            message={parsedMessage}
            origin={params.session.origin}
          />
        )}
      </div>

      <footer className="approval-text__footer">
        <FooterBar
          hasShadow={footerShowShadow}
          origin={params.session.origin}
          originLogo={params.session.icon}
          chain={chain}
          gnosisAccount={isGnosis ? account : undefined}
          onCancel={handleCancel}
          securityLevel={securityLevel}
          hasUnProcessSecurityResult={hasUnProcessSecurityResult}
          onSubmit={() => handleAllow()}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          disabledProcess={
            isLoading ||
            (isLedger && !useLedgerLive && !hasConnectedLedgerHID) ||
            isWatch ||
            hasUnProcessSecurityResult
          }
          isTestnet={chain?.isTestnet}
          onIgnoreAllRules={handleIgnoreAllRules}
        />
      </footer>
      <RuleDrawer
        selectRule={currentTx.ruleDrawer.selectRule}
        visible={currentTx.ruleDrawer.visible}
        onIgnore={handleIgnoreRule}
        onUndo={handleUndoIgnore}
        onRuleEnableStatusChange={handleRuleEnableStatusChange}
        onClose={handleRuleDrawerClose}
      />
      <TokenDetailPopup
        token={tokenDetail.selectToken}
        visible={tokenDetail.popupVisible}
        onClose={() => dispatch.sign.closeTokenDetailPopup()}
        canClickToken={false}
        hideOperationButtons
        variant="add"
      />
    </>
  );
};

export default SignTypedData;
