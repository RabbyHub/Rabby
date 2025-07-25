import React, { ReactNode, useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';
import { Result } from '@rabby-wallet/rabby-security-engine';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
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
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { parseSignTypedDataMessage } from './SignTypedDataExplain/parseSignTypedDataMessage';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import Actions from './TypedDataActions';
import { normalizeTypeData } from './TypedDataActions/utils';
import {
  Level,
  defaultRules,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { isTestnetChainId, findChain } from '@/utils/chain';
import { TokenDetailPopup } from '@/ui/views/Dashboard/components/TokenDetailPopup';
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
import { getCexInfo } from '@/ui/models/exchange';
import {
  MultiAction,
  TypeDataActionItem,
} from '@rabby-wallet/rabby-api/dist/types';

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

const SignTypedData = ({
  params,
  account,
}: {
  params: SignTypedDataProps;
  account: Account;
}) => {
  const currentAccount = params.isGnosis ? params.account! : account;
  const renderStartAt = useRef(0);
  const actionType = useRef('');
  const [, resolveApproval, rejectApproval] = useApproval();
  const { t } = useTranslation();
  const wallet = useWallet();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const securityEngineCtx = useRef<any>(null);
  const logId = useRef('');
  const [isLoading, setIsLoading] = useState(true);
  const [isWatch, setIsWatch] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [footerShowShadow, setFooterShowShadow] = useState(false);
  const { executeEngine } = useSecurityEngine();
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const dispatch = useRabbyDispatch();
  const { userData, rules, currentTx, tokenDetail } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
    tokenDetail: s.sign.tokenDetail,
  }));
  const [currentChainId, setCurrentChainId] = useState<number | undefined>(
    undefined
  );

  const isGnosisAccount = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [gnosisFooterBarVisible, setGnosisFooterBarVisible] = useState(false);
  const [currentGnosisAdmin, setCurrentGnosisAdmin] = useState<Account | null>(
    null
  );

  const [actionRequireData, setActionRequireData] = useState<ActionRequireData>(
    null
  );
  const [
    parsedActionData,
    setParsedActionData,
  ] = useState<ParsedTypedDataActionData | null>(null);
  const [multiActionList, setMultiActionList] = useState<
    ParsedTypedDataActionData[]
  >([]);
  const [multiActionRequireDataList, setMultiActionRequireDataList] = useState<
    ActionRequireData[]
  >([]);
  const [
    multiActionEngineResultList,
    setMultiActionEngineResultList,
  ] = useState<Result[][]>([]);
  const isMultiActions = useMemo(() => {
    return !parsedActionData && multiActionList.length > 0;
  }, [parsedActionData, multiActionList]);
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

  const { data, session, method, isGnosis } = params;
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
        const displayData = cloneDeep(v);
        const normalized = normalizeTypeData(v);
        return [normalized, displayData];
      } catch (error) {
        console.error('parse signTypedData error: ', error);
        return [null, null];
      }
    }
    return [null, null];
  }, [data, isSignTypedDataV1]);

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
      console.log('parse message error', err);
    }
  }, []);

  const chain = useMemo(() => {
    if (!isSignTypedDataV1 && signTypedData) {
      let chainId;
      try {
        chainId = signTypedData?.domain?.chainId;
      } catch (error) {
        console.error(error);
      }
      if (chainId) {
        return findChain({ id: chainId }) || undefined;
      }
    }

    return undefined;
  }, [data, isSignTypedDataV1, signTypedData]);

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

  const { value: typedDataActionData, loading, error } = useAsync(async () => {
    if (isGnosisAccount) {
      if (!isViewGnosisSafe) {
        wallet.clearGnosisMessage();
      }
    }
    if (!isSignTypedDataV1 && signTypedData) {
      const chainId = signTypedData?.domain?.chainId;
      if (isTestnetChainId(chainId)) {
        return null;
      }
      return wallet.openapi.parseCommon({
        typed_data: signTypedData,
        user_addr: currentAccount!.address,
        origin: session.origin,
      });
    }
    return;
  }, [data, isSignTypedDataV1, signTypedData]);

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
          <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
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
  const { data: currentSafeMessage } = useCheckCurrentSafeMessage(
    {
      chainId: currentChainId,
      safeMessageHash,
      threshold: safeInfo?.threshold,
      account: currentAccount,
    },
    {
      onSuccess(res) {
        if (res?.isFinished) {
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
                    onClick={() => {
                      modal.destroy();
                      resolveApproval(res.safeMessage.preparedSignature);
                    }}
                    className="text-[15px] h-[40px] rounded-[6px]"
                  >
                    {t('global.ok')}
                  </Button>
                </div>
              </div>
            ),
          });
        }
      },
    }
  );

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
    if (activeApprovalPopup()) {
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
    resolveApproval({});
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
        ? wallet.testnetOpenapi
        : wallet.openapi,
    });
    return requireData;
  };

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
    const ctx = await formatSecurityEngineContext({
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
    securityEngineCtx.current = ctx;
    const result = await executeEngine(ctx);
    return result;
    // setEngineResults(result);
  };

  const executeSecurityEngine = async () => {
    if (!parsedActionData) {
      return;
    }
    let chainServerId: string | undefined;
    if (parsedActionData.chainId) {
      chainServerId = findChain({
        id: Number(parsedActionData.chainId),
      })?.serverId;
    }
    const ctx = await formatSecurityEngineContext({
      type: 'typed_data',
      actionData: parsedActionData,
      requireData: actionRequireData,
      chainId: chainServerId || CHAINS.ETH.serverId,
      isTestnet: isTestnetChainId(parsedActionData.chainId),
      provider: {
        getTimeSpan,
        hasAddress: wallet.hasAddress,
      },
      origin: params.session.origin,
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

    const typedData = generateTypedData({
      safeAddress: safeInfo.address,
      safeVersion: safeInfo.version,
      chainId: BigInt(currentChainId!),
      data: signTypedData as any,
    });

    if (WaitingSignMessageComponent[account.type]) {
      wallet.signTypedDataWithUI(
        account.type,
        account.address,
        typedData as any,
        {
          brandName: account.brandName,
          version: 'V4',
        }
      );

      resolveApproval({
        uiRequestComponent: WaitingSignMessageComponent[account.type],
        type: account.type,
        address: account.address,
        data: [account.address, JSON.stringify(typedData)],
        isGnosis: true,
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
    executeSecurityEngine();
  }, [rules]);

  useEffect(() => {
    const sender = isSignTypedDataV1 ? params.data[1] : params.data[0];
    if (!loading) {
      if (typedDataActionData) {
        logId.current = typedDataActionData.log_id;
        actionType.current = typedDataActionData?.action?.type || '';
        if (typedDataActionData?.action?.type === 'multi_actions') {
          const actions = typedDataActionData.action.data as MultiAction;
          const res = actions.map((action) =>
            parseAction({
              type: 'typed_data',
              data: action as TypeDataActionItem,
              typedData: signTypedData,
              sender,
              balanceChange:
                typedDataActionData.pre_exec_result?.balance_change,
              preExecVersion:
                typedDataActionData.pre_exec_result?.pre_exec_version,
              gasUsed: typedDataActionData.pre_exec_result?.gas.gas_used,
            })
          );
          setMultiActionList(res);
          Promise.all(
            res.map((item) => {
              if (!item.contractId) {
                item.contractId =
                  typedDataActionData.contract_call_data?.contract.id;
              }
              return getRequireData(item);
            })
          ).then(async (requireDataList) => {
            setMultiActionRequireDataList(requireDataList);
            const results = await Promise.all(
              requireDataList.map((requireData, index) => {
                return getSecurityEngineResult({
                  data: res[index],
                  requireData,
                });
              })
            );
            setMultiActionEngineResultList(results);
            setIsLoading(false);
          });
        } else {
          const parsed = parseAction({
            type: 'typed_data',
            data: typedDataActionData.action as any,
            typedData: signTypedData,
            sender,
            balanceChange: typedDataActionData.pre_exec_result?.balance_change,
            preExecVersion:
              typedDataActionData.pre_exec_result?.pre_exec_version,
            gasUsed: typedDataActionData.pre_exec_result?.gas.gas_used,
          });
          setParsedActionData(parsed);
          if (!parsed.contractId) {
            parsed.contractId =
              typedDataActionData.contract_call_data?.contract.id;
          }
          getRequireData(parsed).then(async (requireData) => {
            setActionRequireData(requireData);
            const securityEngineResult = await getSecurityEngineResult({
              data: parsed,
              requireData,
            });
            setEngineResults(securityEngineResult);
            setIsLoading(false);
          });
        }
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
    if (logId.current && !isLoading && securityEngineCtx.current) {
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
  }, [isLoading, engineResults]);

  useEffect(() => {
    renderStartAt.current = Date.now();
    init();
    dispatch.securityEngine.init();
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
    <>
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
        {!isLoading && (
          <Actions
            account={currentAccount}
            data={parsedActionData}
            requireData={actionRequireData}
            chain={chain}
            engineResults={engineResults}
            raw={isSignTypedDataV1 ? data[0] : rawMessage || data[1]}
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
                  }
                : undefined
            }
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
              // securityLevel={securityLevel}
              // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
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
          disabledProcess={isLoading || isWatch || hasUnProcessSecurityResult}
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
        account={currentAccount}
      />
    </>
  );
};

export default SignTypedData;
