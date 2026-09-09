import React, { ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsyncRetry } from 'react-use';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Button, Drawer, Modal, Skeleton } from 'antd';
import { useScroll } from 'react-use';
import { useSize, useDebounceFn } from 'ahooks';
import { cloneDeep } from 'lodash';
import { underline2Camelcase } from '@/background/utils';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import {
  ALIAS_ADDRESS,
  CHAINS,
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
  KEYRING_TYPE,
  REJECT_SIGN_TEXT_KEYRINGS,
} from 'consts';
import {
  getTimeSpan,
  useApproval,
  useCommonPopupView,
  useWallet,
} from 'ui/utils';
import { WaitingSignMessageComponent } from './map';
import { Account } from '@/background/service/preference';
import { FooterBar } from './FooterBar/FooterBar';
import {
  SecurityEngineScopeProvider,
  useSecurityEngineStore,
} from '@/ui/state/securityEngine';
import {
  filterPrimaryType,
  parseSignTypedDataMessage,
} from './SignTypedDataExplain/parseSignTypedDataMessage';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import { getActionSecurityGate } from './SecurityEngine/actionSecurity';
import Actions from './TypedDataActions';
import {
  cleanEIP712Payload,
  isDeepJSON,
  normalizeTypeData,
} from './TypedDataActions/utils';
import {
  ContextActionData,
  Level,
  defaultRules,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { isTestnetChainId, findChain } from '@/utils/chain';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
import { useSignStore } from '@/ui/state/sign';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import clsx from 'clsx';
import stats from '@/stats';
import {
  parseAction,
  formatSecurityEngineContext,
  fetchActionRequiredData,
  ActionRequireData,
  ParsedTypedDataActionData,
} from '@rabby-wallet/rabby-action';
import { useGetCurrentSafeInfo } from '../hooks/useGetCurrentSafeInfo';
import { useGetMessageHash } from '../hooks/useGetCurrentMessageHash';
import { useCheckCurrentSafeMessage } from '../hooks/useCheckCurrentSafeMessage';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import { generateTypedData } from '@safe-global/protocol-kit';
import { ga4 } from '@/utils/ga4';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { getCexInfo } from '@/ui/state/exchange';
import {
  MultiAction,
  TypeDataActionItem,
} from '@rabby-wallet/rabby-api/dist/types';
import { requestLedgerHIDPermission } from '@/ui/utils/ledger-dmk';
import { tokenizeSignTypedDataMessage } from './signMessageHighlighter';
import { addSignMessageOriginFallback } from './signMessageOrigin';
import { useSignMessageAddressData } from './useSignMessageAddressData';

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
  $ctx?: any;
}

const POLYGON_CHAIN_ID = 137;
const POLYGON_META_TRANSACTION_PRIMARY_TYPES = new Set([
  'MetaTransaction',
  'NativeMetaTransaction',
]);

// Polygon legacy meta transactions may encode the chain as domain.salt instead
// of domain.chainId. We only patch the typed-data copy used for parsing/display.
const normalizePolygonMetaTransactionTypedData = (
  typedData: Record<string, any> | null
) => {
  if (
    !typedData?.domain ||
    typedData.domain.chainId ||
    !typedData.domain.salt ||
    !typedData.message?.functionSignature
  ) {
    return typedData;
  }

  const primaryType = typedData.primaryType;
  const hasMetaTransactionShape =
    POLYGON_META_TRANSACTION_PRIMARY_TYPES.has(primaryType) ||
    typedData.types?.[primaryType]?.some(
      (field) => field?.name === 'functionSignature'
    );
  if (!hasMetaTransactionShape) {
    return typedData;
  }

  let chainId: number;
  try {
    chainId = Number(BigInt(typedData.domain.salt));
  } catch (error) {
    return typedData;
  }
  if (chainId !== POLYGON_CHAIN_ID) {
    return typedData;
  }

  const normalizedTypedData = cloneDeep(typedData);
  normalizedTypedData.domain.chainId = chainId;
  return normalizedTypedData;
};

const SignTypedData = ({
  params,
  account,
  approvalId,
}: {
  params: SignTypedDataProps;
  account: Account;
  approvalId?: string;
}) => {
  const currentAccount = params.isGnosis ? params.account! : account;
  const renderStartAt = useRef(0);
  const actionType = useRef('');
  const evaluationVersion = useRef(0);
  const renderSecurityVersion = evaluationVersion.current;
  const securityStateRef = useRef<{ canSign: boolean; evaluation: unknown }>({
    canSign: false,
    evaluation: null,
  });
  const submissionEvaluationRef = useRef<unknown>(null);
  const canSignCurrentRef = useRef<() => boolean>(() => false);
  const [, resolveApproval, rejectApproval] = useApproval({
    approvalId,
    approvalComponent: 'SignTypedData',
    canResolve: () =>
      renderSecurityVersion === evaluationVersion.current &&
      canSignCurrentRef.current() &&
      submissionEvaluationRef.current === securityStateRef.current.evaluation,
  });
  const { t } = useTranslation();
  const wallet = useWallet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const securityEngineCtx = useRef<any>(null);
  const isUnparsedAction = useRef(false);
  const logId = useRef('');
  const [isWatch, setIsWatch] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [footerShowShadow, setFooterShowShadow] = useState(false);
  const { executeEngine } = useSecurityEngine();
  const securityEngine = useSecurityEngineStore();
  const { userData, rules, currentTx } = securityEngine;
  const tokenDetail = useSignStore((state) => state.tokenDetail);
  const closeTokenDetailPopup = useSignStore(
    (state) => state.closeTokenDetailPopup
  );
  const [currentChainId, setCurrentChainId] = useState<number | undefined>(
    undefined
  );

  const isGnosisAccount = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [gnosisFooterBarVisible, setGnosisFooterBarVisible] = useState(false);
  const [currentGnosisAdmin, setCurrentGnosisAdmin] = useState<Account | null>(
    null
  );

  type PreparedActions = {
    requestKey: string;
    multi: boolean;
    actions: ParsedTypedDataActionData[];
    requireData: ActionRequireData[];
  };
  const [
    preparedActions,
    setPreparedActions,
  ] = useState<PreparedActions | null>(null);
  const [preparationError, setPreparationError] = useState(false);
  const [securityRevision, setSecurityRevision] = useState(0);
  const [securityEvaluation, setSecurityEvaluation] = useState<{
    input: PreparedActions;
    rules: typeof rules;
    userData: typeof userData;
    revision: number;
    version: number;
    message: string;
    status: 'pending' | 'ready' | 'error';
    results: Result[][];
  } | null>(null);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();

  const { data, session, method, isGnosis } = params;
  const requestKey = JSON.stringify([
    approvalId,
    method,
    data,
    session.origin,
    currentAccount.address,
    currentAccount.type,
    currentChainId,
  ]);
  const [parsedMessage, setParsedMessage] = useState('');
  const [_message, setMessage] = useState('');

  const isSignTypedDataV1 = useMemo(
    () => /^eth_signTypedData(_v1)?$/.test(method),
    [method]
  );
  const [signTypedData, rawMessage]: (null | Record<
    string,
    any
  >)[] = useMemo(() => {
    if (!isSignTypedDataV1) {
      try {
        const v = JSON.parse(data[1]);

        let v2 = v;
        // if the payload is too deep, we need to clean it
        if (isDeepJSON(v, 100)) {
          v2 = cleanEIP712Payload(v);
        }

        const displayData = cloneDeep(v2);
        const normalized = normalizeTypeData(v2);
        return [normalized, displayData];
      } catch (error) {
        console.error('parse signTypedData error: ', error);
        return [null, null];
      }
    }
    return [null, null];
  }, [data, isSignTypedDataV1]);
  const normalizedSignTypedData = useMemo(
    () => normalizePolygonMetaTransactionTypedData(signTypedData),
    [signTypedData]
  );

  useEffect(() => {
    try {
      // signTypeDataV1 [Message, from]
      let message;
      let displayMessage;
      if (/^eth_signTypedData(_v1)?$/.test(method)) {
        message = data[0].reduce((m, n) => {
          m[n.name] = n.value;
          return m;
        }, {});
        displayMessage = message;
      } else {
        // [from, Message]
        /**
         * To avoid bypass, we need to normalize body of typedData before
         * decode from server, but normalized value may not same as origin
         * so use displayMessage for UI display
         * */
        displayMessage = parseSignTypedDataMessage(data[1]);
        message = parseSignTypedDataMessage(signTypedData || data[1]);
      }

      setMessage(message);
      setParsedMessage(JSON.stringify(displayMessage, null, 4));
    } catch (err) {
      setMessage('');
      setParsedMessage('');
      console.log('parse message error', err);
    }
  }, [data, method, signTypedData]);

  const messageTokens = useMemo(() => {
    if (!parsedMessage) return undefined;
    if (isSignTypedDataV1) {
      const fields = (Array.isArray(data[0]) ? data[0] : []) as Array<{
        name: string;
        type: string;
        value: unknown;
      }>;
      const message = fields.reduce<Record<string, unknown>>(
        (result, field) => {
          result[field.name] = field.value;
          return result;
        },
        {}
      );
      return tokenizeSignTypedDataMessage(
        {
          primaryType: 'RabbySignTypedDataV1',
          types: {
            RabbySignTypedDataV1: fields.map(({ name, type }) => ({
              name,
              type,
            })),
          },
          message,
        },
        parsedMessage
      );
    }

    return rawMessage
      ? tokenizeSignTypedDataMessage(rawMessage, parsedMessage)
      : undefined;
  }, [data, isSignTypedDataV1, parsedMessage, rawMessage]);

  const chain = useMemo(() => {
    if (!isSignTypedDataV1 && normalizedSignTypedData) {
      let chainId;
      try {
        chainId = normalizedSignTypedData?.domain?.chainId;
      } catch (error) {
        console.error(error);
      }
      if (chainId) {
        return findChain({ id: chainId }) || undefined;
      }
    }

    if (currentChainId) {
      return findChain({ id: currentChainId }) || undefined;
    }

    return undefined;
  }, [currentChainId, isSignTypedDataV1, normalizedSignTypedData]);
  const addressData = useSignMessageAddressData({
    tokens: messageTokens || [],
    chain: chain || CHAINS.ETH,
    accountAddress: currentAccount.address,
  });

  const getCurrentChainId = async () => {
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      const site = await wallet.getConnectedSite(params.session.origin);
      if (site) {
        return findChain({
          enum: site.chain,
        })?.id;
      }
    } else if (params.$ctx.chainId) {
      return params.$ctx.chainId;
    } else {
      return chain?.id;
    }
  };
  useEffect(() => {
    getCurrentChainId().then((id) => {
      setCurrentChainId(id);
    });
  }, [params.session.origin]);

  const {
    value: parsedResponse,
    loading,
    error,
    retry: retryParse,
  } = useAsyncRetry(async () => {
    if (isGnosisAccount) {
      if (!isViewGnosisSafe) {
        wallet.clearGnosisMessage();
      }
    }
    if (!isSignTypedDataV1 && normalizedSignTypedData) {
      const chainId = normalizedSignTypedData?.domain?.chainId;
      if (isTestnetChainId(chainId)) {
        return { requestKey, response: null };
      }
      const response = await wallet.openapi.parseCommon({
        typed_data: normalizedSignTypedData,
        user_addr: currentAccount!.address,
        origin: session.origin,
      });
      if (!response) throw new Error('Missing typed-data parse response');
      return { requestKey, response };
    }
    return { requestKey, response: null };
  }, [requestKey, isSignTypedDataV1, normalizedSignTypedData]);
  const typedDataActionData =
    parsedResponse?.requestKey === requestKey ? parsedResponse.response : null;
  const currentPreparedActions =
    preparedActions?.requestKey === requestKey ? preparedActions : null;
  const isMultiActions = !!currentPreparedActions?.multi;
  const parsedActionData = isMultiActions
    ? null
    : currentPreparedActions?.actions[0] || null;
  const actionRequireData = isMultiActions
    ? null
    : currentPreparedActions?.requireData[0] || null;
  const multiActionList = isMultiActions ? currentPreparedActions!.actions : [];
  const multiActionRequireDataList = isMultiActions
    ? currentPreparedActions!.requireData
    : [];
  const evaluationIsCurrent =
    !!currentPreparedActions &&
    securityEvaluation?.input === currentPreparedActions &&
    securityEvaluation.rules === rules &&
    securityEvaluation.userData === userData &&
    securityEvaluation.revision === securityRevision &&
    securityEvaluation.message === parsedMessage;
  const evaluationReady =
    !loading &&
    !error &&
    !preparationError &&
    evaluationIsCurrent &&
    securityEvaluation?.status === 'ready';
  const evaluationResults = evaluationReady ? securityEvaluation!.results : [];
  const actionSecurityGroups = evaluationResults.map((results, index) => ({
    scope: `${approvalId || 'unbound'}:${securityEvaluation!.version}:${index}`,
    results,
  }));
  const {
    securityLevel,
    hasUnProcessSecurityResult,
    pendingRuleKeys,
  } = getActionSecurityGate(
    actionSecurityGroups,
    currentTx.processedRules,
    'typedData'
  );
  const securityCheckFailed =
    !!error ||
    preparationError ||
    (evaluationIsCurrent && securityEvaluation?.status === 'error');
  const isLoading = !securityCheckFailed && (loading || !evaluationReady);
  const securityBlocked = !evaluationReady || hasUnProcessSecurityResult;
  const engineResults = isMultiActions ? [] : evaluationResults[0] || [];
  const multiActionEngineResultList = isMultiActions ? evaluationResults : [];
  securityStateRef.current = {
    canSign: !securityBlocked && !isWatch,
    evaluation: securityEvaluation,
  };
  canSignCurrentRef.current = () => {
    const currentSecurity = useSecurityEngineStore.getState();
    return (
      securityStateRef.current.canSign &&
      securityEvaluation?.rules === currentSecurity.rules &&
      securityEvaluation?.userData === currentSecurity.userData &&
      !getActionSecurityGate(
        actionSecurityGroups,
        currentSecurity.currentTx.processedRules,
        'typedData'
      ).hasUnProcessSecurityResult
    );
  };
  const canContinueSigning = (evaluation: unknown) =>
    canSignCurrentRef.current() &&
    securityStateRef.current.evaluation === evaluation;
  const resolveWithSecurityGate = (result: any) => {
    if (!canSignCurrentRef.current()) return;
    submissionEvaluationRef.current = securityStateRef.current.evaluation;
    return resolveApproval(result);
  };
  const retrySecurityCheck = () => {
    securityStateRef.current.canSign = false;
    setPreparedActions(null);
    setPreparationError(false);
    setSecurityRevision((revision) => revision + 1);
    retryParse();
  };

  if (error) {
    console.error('error', error);
  }

  const checkWachMode = async () => {
    if (
      currentAccount &&
      currentAccount.type === KEYRING_TYPE.WatchAddressKeyring
    ) {
      setIsWatch(true);
      setCantProcessReason(
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
    if (
      currentAccount &&
      currentAccount.type === KEYRING_TYPE.GnosisKeyring &&
      isSignTypedDataV1
    ) {
      setIsWatch(true);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconGnosis} alt="" className="w-[24px] shrink-0" />
          {t('page.signTypedData.safeCantSignTypedData')}
        </div>
      );
    }
  };

  const isViewGnosisSafe = params?.$ctx?.isViewGnosisSafe;
  const { data: safeInfo } = useGetCurrentSafeInfo({
    chainId: currentChainId,
    account: currentAccount,
  });
  const { data: safeMessageHash } = useGetMessageHash({
    chainId: currentChainId,
    message: rawMessage,
    account: currentAccount,
  });
  const [finishedSafeMessage, setFinishedSafeMessage] = useState<{
    requestKey: string;
    signature: string;
  } | null>(null);
  const { data: currentSafeMessage } = useCheckCurrentSafeMessage(
    {
      chainId: currentChainId,
      safeMessageHash,
      threshold: safeInfo?.threshold,
      account: currentAccount,
    },
    {
      onSuccess(res) {
        if (res?.isFinished && res.safeMessage.preparedSignature) {
          setFinishedSafeMessage({
            requestKey,
            signature: res.safeMessage.preparedSignature,
          });
        }
      },
    }
  );

  useEffect(() => {
    // Keep the risk review accessible before offering an existing Safe
    // signature, and bind the confirmation to this evaluated request.
    if (
      finishedSafeMessage?.requestKey !== requestKey ||
      !canSignCurrentRef.current()
    )
      return;
    const evaluation = securityEvaluation;
    const modal = Modal.info({
      maskClosable: false,
      closable: false,
      width: 320,
      centered: true,
      className: 'same-safe-message-modal modal-support-darkmode',
      content: (
        <div>
          <div className="text-[16px] leading-[140%] text-r-neutral-title1 font-medium text-center">
            {t('page.signText.sameSafeMessageAlert')}
          </div>
          <div className="mt-[32px]">
            <Button
              type="primary"
              block
              onClick={async () => {
                if (!canContinueSigning(evaluation)) return;
                if (
                  await resolveWithSecurityGate(finishedSafeMessage.signature)
                ) {
                  setFinishedSafeMessage(null);
                  modal.destroy();
                }
              }}
              className="text-[15px] h-[40px] rounded-[6px]"
            >
              {t('global.ok')}
            </Button>
          </div>
        </div>
      ),
    });
    return () => modal.destroy();
  }, [finishedSafeMessage, requestKey, securityEvaluation, securityBlocked]);

  const report = async (
    action:
      | 'createSignText'
      | 'startSignText'
      | 'cancelSignText'
      | 'completeSignText',
    extra?: Record<string, any>
  ) => {
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

      if (action === 'createSignText') {
        ga4.fireEvent('Init_SignText', {
          event_category: 'SignText',
        });
      } else if (action === 'startSignText') {
        ga4.fireEvent('Submit_SignText', {
          event_category: 'SignText',
        });
      }

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
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = async () => {
    const evaluation = securityStateRef.current.evaluation;
    if (!canContinueSigning(evaluation) || activeApprovalPopup()) {
      return;
    }

    if (isGnosisAccount) {
      setDrawerVisible(true);
      return;
    }

    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
    }

    if (currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER) {
      try {
        await requestLedgerHIDPermission();
      } catch (e) {
        // ignore transport create error when ledger is not connected, it works but idk why
        console.log(e);
      }
    }
    if (!canContinueSigning(evaluation)) return;
    if (
      currentAccount?.type &&
      WaitingSignMessageComponent[currentAccount?.type]
    ) {
      resolveWithSecurityGate({
        uiRequestComponent: WaitingSignMessageComponent[currentAccount?.type],
        $account: currentAccount,
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
    resolveWithSecurityGate({});
  };

  const init = async () => {
    if (
      currentAccount?.type &&
      REJECT_SIGN_TEXT_KEYRINGS.includes(currentAccount.type as any)
    ) {
      rejectApproval('This address can not sign text message', false, true);
    }
    setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
  };

  const getRequireData = async (data: ParsedTypedDataActionData) => {
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      const site = await wallet.getConnectedSite(params.session.origin);
      if (site) {
        data.chainId = findChain({ enum: site.chain })?.id.toString();
      }
    }
    if (!currentAccount) throw new Error('No current account found');
    let chainServerId: string | undefined;
    if (data.chainId) {
      chainServerId = findChain({
        id: Number(data.chainId),
      })?.serverId;
    }
    const cexInfo = await getCexInfo(data.send?.to || '', wallet);

    const requireData = await fetchActionRequiredData({
      type: 'typed_data',
      actionData: data,
      sender: currentAccount.address,
      chainId: chainServerId || CHAINS.ETH.serverId,
      walletProvider: {
        ethRpc: wallet.requestETHRpc,
        hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
        hasAddress: wallet.hasAddress,
        getWhitelist: wallet.getWhitelist,
        isWhitelistEnabled: wallet.isWhitelistEnabled,
        getPendingTxsByNonce: wallet.getPendingTxsByNonce,
        findChain,
        ALIAS_ADDRESS,
      },
      cex: cexInfo,
      apiProvider: isTestnetChainId(data.chainId)
        ? ((wallet.fakeTestnetOpenapi as unknown) as any)
        : wallet.openapi,
    });
    return requireData;
  };

  const withOriginFallback = (ctx: ContextActionData): ContextActionData =>
    addSignMessageOriginFallback(ctx, {
      isUnparsedAction: isUnparsedAction.current,
      isInternalOrigin: params.session.origin === INTERNAL_REQUEST_ORIGIN,
      message: parsedMessage,
      origin: params.session.origin,
    });

  const getSecurityEngineResult = async ({
    data,
    requireData,
  }: {
    data: ParsedTypedDataActionData;
    requireData: ActionRequireData;
  }) => {
    let chainServerId: string | undefined;
    if (data.chainId) {
      chainServerId = findChain({
        id: Number(data.chainId),
      })?.serverId;
    }
    const baseCtx = await formatSecurityEngineContext({
      type: 'typed_data',
      actionData: data,
      requireData,
      chainId: chainServerId || CHAINS.ETH.serverId,
      isTestnet: isTestnetChainId(data.chainId),
      provider: {
        getTimeSpan,
        hasAddress: wallet.hasAddress,
      },
      origin: params.session.origin,
    });
    const ctx = withOriginFallback(baseCtx);
    const result = await executeEngine(ctx);
    if (
      !Array.isArray(result) ||
      result.some((item) => item.enable && item.level === Level.ERROR)
    ) {
      throw new Error('Typed-data security evaluation failed');
    }
    return { result, ctx };
  };

  const handleIgnoreAllRules = () => {
    if (!evaluationReady) return;
    securityEngine.processAllRules([
      ...currentTx.processedRules,
      ...pendingRuleKeys,
    ]);
  };

  const handleIgnoreRule = (id: string) => {
    securityEngine.processRule(id, currentTx.ruleDrawer.selectRule?.scope);
    securityEngine.closeRuleDrawer();
  };

  const handleUndoIgnore = (id: string) => {
    securityEngine.unProcessRule(id, currentTx.ruleDrawer.selectRule?.scope);
    securityEngine.closeRuleDrawer();
  };

  const handleRuleEnableStatusChange = async (id: string, value: boolean) => {
    securityEngine.unProcessRule(id, currentTx.ruleDrawer.selectRule?.scope);
    await wallet.ruleEnableStatusChange(id, value);
    securityEngine.init();
  };

  const handleRuleDrawerClose = (update: boolean) => {
    if (update) {
      securityStateRef.current.canSign = false;
      setSecurityRevision((revision) => revision + 1);
    }
    securityEngine.closeRuleDrawer();
  };

  const { run: reportLogId } = useDebounceFn(
    (rules) => {
      wallet.openapi.postActionLog({
        id: logId.current,
        type: 'typed_data',
        rules,
      });
    },
    { wait: 1000 }
  );

  const handleDrawerCancel = () => {
    setDrawerVisible(false);
  };

  const handleGnosisConfirm = async (account: Account) => {
    if (!safeInfo) return;
    setGnosisFooterBarVisible(true);
    setCurrentGnosisAdmin(account);
  };

  const handleGnosisSign = async () => {
    const evaluation = securityStateRef.current.evaluation;
    if (!canContinueSigning(evaluation)) return;
    const account = currentGnosisAdmin;
    const signTypedData = rawMessage;
    if (!safeInfo || !account || !signTypedData) {
      return;
    }
    if (activeApprovalPopup()) {
      return;
    }

    if (!isViewGnosisSafe) {
      await wallet.buildGnosisMessage({
        safeAddress: safeInfo.address,
        account,
        version: safeInfo.version,
        networkId: currentChainId + '',
        message: signTypedData,
      });
      await Promise.all(
        (currentSafeMessage?.safeMessage?.confirmations || []).map((item) => {
          return wallet.addPureGnosisMessageSignature({
            signerAddress: item.owner,
            signature: item.signature,
          });
        })
      );
    }

    if (!canContinueSigning(evaluation)) return;
    const typedData = generateTypedData({
      safeAddress: safeInfo.address,
      safeVersion: safeInfo.version,
      chainId: BigInt(currentChainId!),
      data: signTypedData as any,
    });

    if (WaitingSignMessageComponent[account.type]) {
      const approval = await wallet.getApproval();
      if (
        !approvalId ||
        approval?.id !== approvalId ||
        approval?.data.approvalComponent !== 'SignTypedData' ||
        !canContinueSigning(evaluation)
      ) {
        return;
      }
      wallet.signTypedDataWithUI(
        account.type,
        account.address,
        typedData as any,
        {
          brandName: account.brandName,
          version: 'V4',
          sourceApprovalId: approvalId,
          approvalComponent: WaitingSignMessageComponent[account.type],
        }
      );

      resolveWithSecurityGate({
        uiRequestComponent: WaitingSignMessageComponent[account.type],
        type: account.type,
        address: account.address,
        data: [account.address, JSON.stringify(typedData)],
        isGnosis: true,
        sourceApprovalId: approvalId,
        account: account,
        $account: account,
        safeMessage: {
          message: signTypedData,
          safeAddress: safeInfo.address,
          chainId: currentChainId,
          safeMessageHash: safeMessageHash,
        },
        extra: {
          popupProps: {
            maskStyle: {
              backgroundColor: 'transparent',
            },
          },
        },
      });
    }
    return;
  };

  useEffect(() => {
    let cancelled = false;
    setPreparedActions(null);
    setPreparationError(false);
    securityEngine.closeRuleDrawer();
    if (loading || error || parsedResponse?.requestKey !== requestKey) return;
    const prepare = async () => {
      const sender = isSignTypedDataV1 ? params.data[1] : params.data[0];
      isUnparsedAction.current = typedDataActionData?.action === null;
      if (!typedDataActionData) {
        setPreparedActions({
          requestKey,
          multi: false,
          actions: [],
          requireData: [],
        });
        return;
      }
      logId.current = typedDataActionData.log_id;
      actionType.current = typedDataActionData.action?.type || '';
      const multi = typedDataActionData.action?.type === 'multi_actions';
      const actionsToParse = multi
        ? (typedDataActionData.action!.data as MultiAction)
        : [typedDataActionData.action];
      if (multi && actionsToParse.length === 0) {
        throw new Error('Empty multi-action response');
      }
      const actions = actionsToParse.map((action) => {
        const parsed = parseAction({
          type: 'typed_data',
          data: action as TypeDataActionItem,
          typedData: normalizedSignTypedData,
          sender,
          balanceChange: typedDataActionData.pre_exec_result?.balance_change,
          preExecVersion: typedDataActionData.pre_exec_result?.pre_exec_version,
          gasUsed: typedDataActionData.pre_exec_result?.gas.gas_used,
        });
        if (!parsed.contractId) {
          parsed.contractId =
            typedDataActionData.contract_call_data?.contract.id;
        }
        return parsed;
      });
      const requireData = await Promise.all(actions.map(getRequireData));
      if (!cancelled) {
        setPreparedActions({ requestKey, multi, actions, requireData });
      }
    };
    prepare().catch((err) => {
      if (!cancelled) {
        console.error('Failed to prepare typed-data security check', err);
        setPreparationError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, error, parsedResponse, requestKey, normalizedSignTypedData]);

  useEffect(() => {
    const version = ++evaluationVersion.current;
    if (!currentPreparedActions) return;
    const input = currentPreparedActions;
    const evaluation = {
      input,
      rules,
      userData,
      revision: securityRevision,
      version,
      message: parsedMessage,
    };
    setSecurityEvaluation({ ...evaluation, status: 'pending', results: [] });
    securityEngine.closeRuleDrawer();
    Promise.all(
      input.actions.map((action, index) =>
        getSecurityEngineResult({
          data: action,
          requireData: input.requireData[index],
        })
      )
    )
      .then((evaluatedActions) => {
        if (version !== evaluationVersion.current) return;
        securityEngineCtx.current =
          evaluatedActions[evaluatedActions.length - 1]?.ctx;
        setSecurityEvaluation({
          ...evaluation,
          status: 'ready',
          results: evaluatedActions.map((item) => item.result),
        });
      })
      .catch((err) => {
        if (version !== evaluationVersion.current) return;
        console.error('Failed to evaluate typed-data security rules', err);
        setSecurityEvaluation({ ...evaluation, status: 'error', results: [] });
      });
    return () => {
      ++evaluationVersion.current;
    };
  }, [
    currentPreparedActions,
    rules,
    userData,
    securityRevision,
    parsedMessage,
  ]);

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
    if (logId.current && evaluationReady && securityEngineCtx.current) {
      try {
        const keys = Object.keys(securityEngineCtx.current);
        const key: any = keys[0];
        const notTriggeredRules = defaultRules.filter((rule) => {
          return (
            rule.requires.includes(key) &&
            !engineResults.some((item) => item.id === rule.id)
          );
        });
        reportLogId([
          ...notTriggeredRules.map((rule) => ({
            id: rule.id,
            level: null,
          })),
          ...engineResults.map((result) => ({
            id: result.id,
            level: result.level,
          })),
        ]);
      } catch (e) {
        // IGNORE
      }
    }
  }, [evaluationReady, securityEvaluation]);

  useEffect(
    () => () => {
      securityStateRef.current.canSign = false;
      submissionEvaluationRef.current = null;
    },
    []
  );

  useEffect(() => {
    renderStartAt.current = Date.now();
    init();
    securityEngine.init();
    checkWachMode();
    report('createSignText');
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const duration = Date.now() - renderStartAt.current;
      stats.report('signPageRenderTime', {
        type: 'typedata',
        actionType: actionType.current,
        chain: chain?.serverId || '',
        duration,
      });
    }
  }, [isLoading]);

  return (
    <SecurityEngineScopeProvider scope={actionSecurityGroups[0]?.scope}>
      <div className="approval-text relative">
        {isLoading && (
          <Skeleton.Input
            active
            style={{
              width: 358,
              height: 400,
            }}
          />
        )}
        {securityCheckFailed && (
          <div className="p-20 text-center">
            <div>{t('global.failed')}</div>
            <Button onClick={retrySecurityCheck}>{t('global.refresh')}</Button>
          </div>
        )}
        {!isLoading && !securityCheckFailed && (
          <Actions
            account={currentAccount}
            data={parsedActionData}
            requireData={actionRequireData}
            chain={chain}
            engineResults={engineResults}
            raw={isSignTypedDataV1 ? data[0] : rawMessage || data[1]}
            copyMessage={isSignTypedDataV1 ? JSON.stringify(data[0]) : data[1]}
            message={parsedMessage}
            origin={params.session.origin}
            originLogo={params.session.icon}
            typedDataActionData={typedDataActionData}
            multiAction={
              isMultiActions
                ? {
                    actionList: multiActionList,
                    requireDataList: multiActionRequireDataList,
                    engineResultList: multiActionEngineResultList,
                    securityScopes: actionSecurityGroups.map(
                      (group) => group.scope
                    ),
                  }
                : undefined
            }
            messageTokens={messageTokens}
            addressData={addressData}
          />
        )}
        {isGnosisAccount && safeInfo && (
          <Drawer
            placement="bottom"
            height="400px"
            className="gnosis-drawer is-support-darkmode"
            visible={drawerVisible}
            onClose={() => setDrawerVisible(false)}
            maskClosable
          >
            <GnosisDrawer
              safeInfo={safeInfo}
              onCancel={handleDrawerCancel}
              onConfirm={handleGnosisConfirm}
              confirmations={
                isGnosisAccount
                  ? currentSafeMessage?.safeMessage?.confirmations || []
                  : undefined
              }
            />
          </Drawer>
        )}

        {isGnosisAccount && safeInfo && currentGnosisAdmin && (
          <Drawer
            placement="bottom"
            height="fit-content"
            className="gnosis-footer-bar is-support-darkmode"
            visible={gnosisFooterBarVisible}
            onClose={() => setGnosisFooterBarVisible(false)}
            maskClosable
            closable={false}
            bodyStyle={{
              padding: 0,
            }}
          >
            <FooterBar
              origin={params.session.origin}
              originLogo={params.session.icon}
              // chain={chain}
              gnosisAccount={currentGnosisAdmin}
              account={currentGnosisAdmin}
              onCancel={handleCancel}
              securityLevel={securityLevel}
              hasUnProcessSecurityResult={hasUnProcessSecurityResult}
              securityBlocked={securityBlocked}
              onSubmit={handleGnosisSign}
              enableTooltip={
                currentGnosisAdmin?.type === KEYRING_TYPE.WatchAddressKeyring
              }
              tooltipContent={
                currentGnosisAdmin?.type ===
                KEYRING_TYPE.WatchAddressKeyring ? (
                  <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
                ) : null
              }
              disabledProcess={
                securityBlocked ||
                currentGnosisAdmin?.type === KEYRING_TYPE.WatchAddressKeyring
              }
              // isSubmitting={isSubmittingGnosis}
              onIgnoreAllRules={handleIgnoreAllRules}
            />
          </Drawer>
        )}
        {!isLoading && chain?.isTestnet ? (
          <div
            className={clsx(
              'absolute top-[350px] right-[10px]',
              'px-[16px] py-[12px] rotate-[-23deg]',
              'border-rabby-neutral-title1 border-[1px] rounded-[6px]',
              'text-r-neutral-title1 text-[20px] leading-[24px]',
              'opacity-30'
            )}
          >
            Custom Network
          </div>
        ) : null}
      </div>

      <footer className="approval-text__footer">
        <FooterBar
          hasShadow={footerShowShadow}
          origin={params.session.origin}
          originLogo={params.session.icon}
          chain={chain}
          gnosisAccount={isGnosis ? account : undefined}
          account={currentAccount}
          onCancel={handleCancel}
          securityLevel={securityLevel}
          hasUnProcessSecurityResult={hasUnProcessSecurityResult}
          onSubmit={() => handleAllow()}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          securityBlocked={securityBlocked}
          disabledProcess={isLoading || isWatch || securityBlocked}
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
        onClose={closeTokenDetailPopup}
        canClickToken={false}
        hideOperationButtons
        variant="add"
        account={currentAccount}
      />
    </SecurityEngineScopeProvider>
  );
};

export default SignTypedData;
