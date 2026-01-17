import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { findChain } from '@/utils/chain';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { Button, Skeleton } from 'antd';
import { Account } from 'background/service/preference';
import {
  CHAINS,
  KEYRING_CLASS,
  KEYRING_TYPE,
} from 'consts';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import { FooterBar } from './FooterBar/FooterBar';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import { WaitingSignMessageComponent } from './map';
import { Eip7702AuthorizationRequest } from '@/background/controller/provider/type';
import clsx from 'clsx';

interface SignAuthorizationProps {
  data: [Eip7702AuthorizationRequest];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const SignAuthorization = ({
  params,
  account,
}: {
  params: SignAuthorizationProps;
  account: Account;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { data, session } = params;
  const authRequest = data[0];
  const [isWatch, setIsWatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLedger, setIsLedger] = useState(false);
  const [cantProcessReason, setCantProcessReason] = useState<ReactNode | null>();
  const [contractInfo, setContractInfo] = useState<{
    isVerified: boolean;
    name?: string;
    deployedAt?: number;
  } | null>(null);
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const { executeEngine } = useSecurityEngine();
  const dispatch = useRabbyDispatch();
  const { currentTx } = useRabbySelector((s) => ({
    currentTx: s.securityEngine.currentTx,
  }));

  const chainInfo = useMemo(() => {
    if (authRequest.chainId === 0) {
      return { name: 'All Chains', id: 0 };
    }
    if (authRequest.chainId) {
      const chain = findChain({ id: authRequest.chainId });
      return chain ? { name: chain.name, id: chain.id } : { name: `Chain ${authRequest.chainId}`, id: authRequest.chainId };
    }
    return null;
  }, [authRequest.chainId]);

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
    }
    return false;
  }, [engineResults, currentTx]);

  const report = async (
    action: 'createSignAuthorization' | 'startSignAuthorization' | 'cancelSignAuthorization',
    extra?: Record<string, any>
  ) => {
    if (!account) return;
    matomoRequestEvent({
      category: 'SignAuthorization',
      action: action,
      label: [getKRCategoryByType(account.type), account.brandName].join('|'),
      transport: 'beacon',
    });
  };

  const handleCancel = () => {
    report('cancelSignAuthorization');
    rejectApproval('User rejected the request.');
  };

  const { activeApprovalPopup } = useCommonPopupView();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = async () => {
    if (activeApprovalPopup()) return;

    if (account?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(account.address);
    }

    if (account?.type && WaitingSignMessageComponent[account?.type]) {
      resolveApproval({
        uiRequestComponent: WaitingSignMessageComponent[account?.type],
        $account: account,
        type: account.type,
        address: account.address,
        extra: {
          brandName: account.brandName,
          signTextMethod: 'eip7702Authorization',
        },
      });
      return;
    }

    report('startSignAuthorization');
    resolveApproval({});
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
    dispatch.securityEngine.closeRuleDrawer();
  };

  const checkWatchMode = async () => {
    setIsLedger(account?.type === KEYRING_CLASS.HARDWARE.LEDGER);
    if (account?.type === KEYRING_TYPE.WatchAddressKeyring) {
      setIsWatch(true);
      setCantProcessReason(
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
  };

  const init = async () => {
    dispatch.securityEngine.init();

    // Generate security warnings based on the authorization request
    const warnings: Result[] = [];

    // Warning for all-chains authorization
    if (authRequest.chainId === 0) {
      warnings.push({
        id: '7702_all_chains',
        level: Level.DANGER,
        enable: true,
      } as Result);
    }

    // Warning for unverified contracts (we don't have verification info yet)
    warnings.push({
      id: '7702_unknown_contract',
      level: Level.WARNING,
      enable: true,
    } as Result);

    setEngineResults(warnings);
    setIsLoading(false);
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    checkWatchMode();
  }, []);

  useEffect(() => {
    report('createSignAuthorization');
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
          <div className="p-[20px]">
            {/* Critical Warning Banner */}
            <div className="bg-[#ec5151] text-white rounded-[8px] p-[16px] mb-[20px]">
              <div className="text-[16px] font-bold mb-[8px]">
                Code Delegation Request
              </div>
              <div className="text-[14px] opacity-90">
                Signing this authorization gives the target contract full control
                over your account. Only proceed if you trust the contract completely.
              </div>
            </div>

            {/* Origin Info */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Requesting Site
              </div>
              <div className="flex items-center gap-[8px]">
                {session.icon && (
                  <img src={session.icon} className="w-[20px] h-[20px] rounded-full" />
                )}
                <span className="text-[14px] text-r-neutral-title1">
                  {session.origin}
                </span>
              </div>
            </div>

            {/* Contract Address */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Delegate Code To
              </div>
              <div className="bg-r-neutral-card2 rounded-[8px] p-[12px]">
                <div className="text-[14px] text-r-neutral-title1 font-mono break-all">
                  {authRequest.contractAddress}
                </div>
              </div>
            </div>

            {/* Chain Info */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Chain Scope
              </div>
              <div className={clsx(
                "rounded-[8px] p-[12px]",
                authRequest.chainId === 0
                  ? "bg-[#ec5151] bg-opacity-10 border border-[#ec5151]"
                  : "bg-r-neutral-card2"
              )}>
                <div className={clsx(
                  "text-[14px]",
                  authRequest.chainId === 0 ? "text-[#ec5151] font-bold" : "text-r-neutral-title1"
                )}>
                  {authRequest.chainId === 0 ? (
                    <>
                      ALL CHAINS - This authorization will work on every EVM chain!
                    </>
                  ) : (
                    chainInfo?.name || 'Current Chain'
                  )}
                </div>
              </div>
            </div>

            {/* From Address */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Your Account
              </div>
              <div className="bg-r-neutral-card2 rounded-[8px] p-[12px]">
                <div className="text-[14px] text-r-neutral-title1 font-mono break-all">
                  {authRequest.from}
                </div>
              </div>
            </div>

            {/* What This Means */}
            <div className="bg-r-neutral-card2 rounded-[8px] p-[12px] mt-[20px]">
              <div className="text-[12px] text-r-neutral-body mb-[8px] font-bold">
                What does this mean?
              </div>
              <ul className="text-[12px] text-r-neutral-body list-disc pl-[16px] space-y-[4px]">
                <li>The contract can execute any transaction as your account</li>
                <li>The contract can transfer your tokens and NFTs</li>
                <li>This can be revoked later, but damage may already be done</li>
                <li>Only sign if you fully understand and trust the contract</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <footer className="approval-text__footer">
        <FooterBar
          securityLevel={securityLevel}
          hasUnProcessSecurityResult={hasUnProcessSecurityResult}
          origin={session.origin}
          originLogo={session.icon}
          account={account}
          enableTooltip={isWatch}
          tooltipContent={cantProcessReason}
          onCancel={handleCancel}
          onSubmit={() => handleAllow()}
          disabledProcess={isWatch || hasUnProcessSecurityResult}
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

export default SignAuthorization;
