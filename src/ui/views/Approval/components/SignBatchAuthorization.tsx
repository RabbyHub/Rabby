import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { findChain } from '@/utils/chain';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { getKRCategoryByType } from '@/utils/transaction';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { Button, Skeleton } from 'antd';
import { Account } from 'background/service/preference';
import { CHAINS, KEYRING_CLASS, KEYRING_TYPE } from 'consts';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApproval, useCommonPopupView, useWallet } from 'ui/utils';
import { useSecurityEngine } from 'ui/utils/securityEngine';
import { FooterBar } from './FooterBar/FooterBar';
import RuleDrawer from './SecurityEngine/RuleDrawer';
import { WaitingSignMessageComponent } from './map';
import { Eip7702BatchAuthorizationRequest } from '@/background/controller/provider/type';
import clsx from 'clsx';

interface SignBatchAuthorizationProps {
  data: [Eip7702BatchAuthorizationRequest];
  session: {
    origin: string;
    icon: string;
    name: string;
  };
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const SignBatchAuthorization = ({
  params,
  account,
}: {
  params: SignBatchAuthorizationProps;
  account: Account;
}) => {
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { data, session } = params;
  const batchRequest = data[0];
  const [isWatch, setIsWatch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLedger, setIsLedger] = useState(false);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [engineResults, setEngineResults] = useState<Result[]>([]);
  const { executeEngine } = useSecurityEngine();
  const dispatch = useRabbyDispatch();
  const { currentTx } = useRabbySelector((s) => ({
    currentTx: s.securityEngine.currentTx,
  }));

  // Categorize authorizations for display
  const categorizedAuths = useMemo(() => {
    return batchRequest.authorizations.map((auth, index) => {
      const isRevoke = auth.contractAddress.toLowerCase() === ZERO_ADDRESS;
      const chainInfo =
        auth.chainId === 0
          ? { name: 'All Chains', id: 0 }
          : auth.chainId
          ? findChain({ id: auth.chainId }) || {
              name: `Chain ${auth.chainId}`,
              id: auth.chainId,
            }
          : null;

      return {
        ...auth,
        index,
        isRevoke,
        chainInfo,
        displayLabel:
          auth.label ||
          (isRevoke ? 'Revoke Delegation' : 'Delegate to Contract'),
      };
    });
  }, [batchRequest.authorizations]);

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
    action:
      | 'createSignBatchAuthorization'
      | 'startSignBatchAuthorization'
      | 'cancelSignBatchAuthorization',
    extra?: Record<string, any>
  ) => {
    if (!account) return;
    matomoRequestEvent({
      category: 'SignBatchAuthorization',
      action: action,
      label: [getKRCategoryByType(account.type), account.brandName].join('|'),
      transport: 'beacon',
    });
  };

  const handleCancel = () => {
    report('cancelSignBatchAuthorization');
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
          signTextMethod: 'eip7702BatchAuthorization',
        },
      });
      return;
    }

    report('startSignBatchAuthorization');
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

    // Generate security warnings based on the authorization requests
    const warnings: Result[] = [];

    // Check for any all-chains authorization
    const hasAllChains = batchRequest.authorizations.some(
      (auth) => auth.chainId === 0
    );
    if (hasAllChains) {
      warnings.push({
        id: '7702_all_chains',
        level: Level.DANGER,
        enable: true,
      } as Result);
    }

    // Warning for unverified contracts
    const hasNonRevoke = batchRequest.authorizations.some(
      (auth) => auth.contractAddress.toLowerCase() !== ZERO_ADDRESS
    );
    if (hasNonRevoke) {
      warnings.push({
        id: '7702_unknown_contract',
        level: Level.WARNING,
        enable: true,
      } as Result);
    }

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
    report('createSignBatchAuthorization');
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
            {/* Info Banner */}
            <div className="bg-[#7084ff] text-white rounded-[8px] p-[16px] mb-[20px]">
              <div className="text-[16px] font-bold mb-[8px]">
                Batch Authorization Request
              </div>
              <div className="text-[14px] opacity-90">
                You are signing {batchRequest.authorizations.length}{' '}
                authorization{batchRequest.authorizations.length > 1 ? 's' : ''}{' '}
                at once. Review each one carefully before approving.
              </div>
            </div>

            {/* Origin Info */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Requesting Site
              </div>
              <div className="flex items-center gap-[8px]">
                {session.icon && (
                  <img
                    src={session.icon}
                    className="w-[20px] h-[20px] rounded-full"
                  />
                )}
                <span className="text-[14px] text-r-neutral-title1">
                  {session.origin}
                </span>
              </div>
            </div>

            {/* Your Account */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[4px]">
                Your Account
              </div>
              <div className="bg-r-neutral-card2 rounded-[8px] p-[12px]">
                <div className="text-[14px] text-r-neutral-title1 font-mono break-all">
                  {batchRequest.from}
                </div>
              </div>
            </div>

            {/* Authorization List */}
            <div className="mb-[16px]">
              <div className="text-[12px] text-r-neutral-body mb-[8px]">
                Authorizations to Sign ({batchRequest.authorizations.length})
              </div>

              <div className="space-y-[12px]">
                {categorizedAuths.map((auth, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'rounded-[8px] p-[12px] border',
                      auth.isRevoke
                        ? 'bg-[#27ae60] bg-opacity-10 border-[#27ae60]'
                        : 'bg-r-neutral-card2 border-transparent'
                    )}
                  >
                    {/* Authorization Header */}
                    <div className="flex items-center justify-between mb-[8px]">
                      <div
                        className={clsx(
                          'text-[14px] font-bold',
                          auth.isRevoke
                            ? 'text-[#27ae60]'
                            : 'text-r-neutral-title1'
                        )}
                      >
                        {auth.displayLabel}
                      </div>
                      <div
                        className={clsx(
                          'text-[12px] px-[8px] py-[2px] rounded-full',
                          auth.isRevoke
                            ? 'bg-[#27ae60] text-white'
                            : 'bg-[#ec5151] bg-opacity-20 text-[#ec5151]'
                        )}
                      >
                        {auth.isRevoke ? 'Safe' : 'Delegation'}
                      </div>
                    </div>

                    {/* Contract Address */}
                    <div className="mb-[6px]">
                      <div className="text-[11px] text-r-neutral-body">
                        {auth.isRevoke ? 'Revokes to' : 'Delegates to'}
                      </div>
                      <div className="text-[12px] text-r-neutral-title1 font-mono break-all">
                        {auth.isRevoke
                          ? 'address(0) - Removes delegation'
                          : auth.contractAddress}
                      </div>
                    </div>

                    {/* Chain & Nonce */}
                    <div className="flex gap-[16px]">
                      <div>
                        <div className="text-[11px] text-r-neutral-body">
                          Chain
                        </div>
                        <div
                          className={clsx(
                            'text-[12px]',
                            auth.chainInfo?.id === 0
                              ? 'text-[#ec5151] font-bold'
                              : 'text-r-neutral-title1'
                          )}
                        >
                          {auth.chainInfo?.name || 'Current Chain'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-r-neutral-body">
                          Nonce
                        </div>
                        <div className="text-[12px] text-r-neutral-title1 font-mono">
                          {auth.nonce.toString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What This Means */}
            <div className="bg-r-neutral-card2 rounded-[8px] p-[12px] mt-[20px]">
              <div className="text-[12px] text-r-neutral-body mb-[8px] font-bold">
                What does this mean?
              </div>
              <ul className="text-[12px] text-r-neutral-body list-disc pl-[16px] space-y-[4px]">
                {categorizedAuths.some((a) => !a.isRevoke) && (
                  <>
                    <li>
                      Delegation authorizations give contracts control over your
                      account
                    </li>
                    <li>
                      The contract can execute transactions and transfer assets
                    </li>
                  </>
                )}
                {categorizedAuths.some((a) => a.isRevoke) && (
                  <li>
                    Revoke authorizations remove existing delegations (safe
                    operation)
                  </li>
                )}
                <li>
                  All {batchRequest.authorizations.length} signatures will be
                  requested together
                </li>
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

export default SignBatchAuthorization;
