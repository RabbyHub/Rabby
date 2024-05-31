import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { findChain } from '@/utils/chain';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import { ParseTextResponse } from '@rabby-wallet/rabby-api/dist/types';
import { Result } from '@rabby-wallet/rabby-security-engine';
import {
  Level,
  defaultRules,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import { useSize, useDebounceFn } from 'ahooks';
import { Skeleton } from 'antd';
import { Account } from 'background/service/preference';
import {
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
  KEYRING_TYPE,
  REJECT_SIGN_TEXT_KEYRINGS,
} from 'consts';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync, useScroll, useThrottleFn } from 'react-use';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { hex2Text, useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import { FooterBar } from './FooterBar/FooterBar';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import Actions from './TextActions';
import {
  TextActionData,
  formatSecurityEngineCtx,
  parseAction,
} from './TextActions/utils';
import { WaitingSignMessageComponent } from './map';
import stats from '@/stats';

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

const SignText = ({ params }: { params: SignTextProps }) => {
  const renderStartAt = useRef(0);
  const actionType = useRef('');
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { data, session, isGnosis = false } = params;
  const [hexData, from] = data;
  const signText = hex2Text(hexData);
  const [isWatch, setIsWatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLedger, setIsLedger] = useState(false);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollRefSize = useSize(scrollRef);
  const scrollInfo = useScroll(scrollRef);
  const securityEngineCtx = useRef<any>(null);
  const logId = useRef('');
  const [footerShowShadow, setFooterShowShadow] = useState(false);
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const [
    parsedActionData,
    setParsedActionData,
  ] = useState<TextActionData | null>(null);
  const { executeEngine } = useSecurityEngine();
  const dispatch = useRabbyDispatch();
  const { userData, rules, currentTx } = useRabbySelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    currentTx: s.securityEngine.currentTx,
  }));
  const [chainId, setChainId] = useState<number | undefined>(undefined);

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
    const hasForbidden = enableResults.find(
      (result) => result.level === Level.FORBIDDEN
    );
    const hasSafe = !!enableResults.find(
      (result) => result.level === Level.SAFE
    );
    const needProcess = enableResults.filter(
      (result) =>
        (result.level === Level.DANGER || result.level === Level.WARNING) &&
        !processedRules.includes(result.id)
    );
    if (hasForbidden) return true;
    if (needProcess.length > 0) {
      return !hasSafe;
    } else {
      return false;
    }
  }, [engineResults, currentTx]);

  const { value: textActionData, loading, error } = useAsync(async () => {
    const currentAccount = await wallet.getCurrentAccount();
    let chainId = 1; // ETH as default
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      const site = await wallet.getConnectedSite(params.session.origin);
      if (site) {
        chainId =
          findChain({
            enum: site.chain,
          })?.id || chainId;
      }
    }
    setChainId(chainId);

    return await wallet.openapi.parseText({
      text: signText,
      address: currentAccount!.address,
      origin: session.origin,
    });
  }, [signText, session]);

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
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = async () => {
    if (activeApprovalPopup()) {
      return;
    }
    const currentAccount = await wallet.getCurrentAccount();

    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
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
          signTextMethod: 'personalSign',
        },
      });

      return;
    }
    report('startSignText');
    resolveApproval({});
  };

  const executeSecurityEngine = async () => {
    const ctx = formatSecurityEngineCtx({
      actionData: parsedActionData!,
      origin: session.origin,
    });
    securityEngineCtx.current = ctx;
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

  const checkWachMode = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    const accountType =
      isGnosis && params.account ? params.account.type : currentAccount?.type;
    setIsLedger(accountType === KEYRING_CLASS.HARDWARE.LEDGER);
    if (accountType === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
      setCantProcessReason(
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

  const init = async (
    textActionData: ParseTextResponse,
    signText: string,
    sender: string
  ) => {
    logId.current = textActionData.log_id;
    dispatch.securityEngine.init();
    const currentAccount = await wallet.getCurrentAccount();
    if (
      currentAccount?.type &&
      REJECT_SIGN_TEXT_KEYRINGS.includes(currentAccount.type as any)
    ) {
      rejectApproval('This address can not sign text message', false, true);
    }
    actionType.current = textActionData?.action?.type || '';
    const parsed = parseAction(textActionData, signText, sender);
    setParsedActionData(parsed);
    const ctx = formatSecurityEngineCtx({
      actionData: parsed,
      origin: params.session.origin,
    });
    const result = await executeEngine(ctx);
    setEngineResults(result);
    setIsLoading(false);
  };

  const { run: reportLogId } = useDebounceFn(
    (rules) => {
      wallet.openapi.postActionLog({
        id: logId.current,
        type: 'text',
        rules,
      });
    },
    { wait: 1000 }
  );

  useEffect(() => {
    if (!loading) {
      if (textActionData) {
        init(textActionData, signText, from);
      } else {
        setIsLoading(false);
      }
    }
  }, [loading, signText, textActionData, params, from]);

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
    executeSecurityEngine();
  }, [rules]);

  useEffect(() => {
    renderStartAt.current = Date.now();
    checkWachMode();
  }, []);

  useEffect(() => {
    report('createSignText');
  }, []);

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
    if (!isLoading) {
      const duration = Date.now() - renderStartAt.current;
      stats.report('signPageRenderTime', {
        type: 'text',
        actionType: actionType.current,
        chain: '',
        duration,
      });
    }
  }, [isLoading]);

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
            engineResults={engineResults}
            raw={hexData}
            message={signText}
            origin={params.session.origin}
            originLogo={params.session.icon}
          />
        )}
      </div>

      <footer className="approval-text__footer">
        <FooterBar
          hasShadow={footerShowShadow}
          securityLevel={securityLevel}
          hasUnProcessSecurityResult={hasUnProcessSecurityResult}
          origin={params.session.origin}
          originLogo={params.session.icon}
          gnosisAccount={isGnosis ? params.account : undefined}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          onCancel={handleCancel}
          onSubmit={() => handleAllow()}
          disabledProcess={
            (isLedger && !hasConnectedLedgerHID) ||
            isWatch ||
            hasUnProcessSecurityResult
          }
          engineResults={engineResults}
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
    </>
  );
};

export default SignText;
