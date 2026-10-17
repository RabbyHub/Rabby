import { ExplainTxResponse, Tx } from '@rabby-wallet/rabby-api/dist/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { message } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { last } from 'lodash';
import { buildDappActionTx, useValidateDappAction } from './hook';
import {
  CLAIM_ALL_MIN_ACTIONS,
  ClaimAllCandidate,
  getClaimAllCandidates,
  getClaimAllCandidatesKey,
  getClaimAllRewardUsdValue,
  isClaimAllPreExecValid,
  mergeBalanceChanges,
} from './claimAllUtils';
import { DisplayedProject } from '@/ui/utils/portfolio/project';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { formatUsdValue, useCommonPopupView, useWallet } from '@/ui/utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import BalanceChange from '@/ui/views/Approval/components/TxComponents/BalanceChange';
import { BalanceChangeLoading } from '@/ui/views/Approval/components/MiniSignTx/BalanceChangeLoanding';
import { findChain } from '@/utils/chain';
import stats from '@/stats';

export const useClaimAllAction = (protocol: DisplayedProject) => {
  const currentAccount = useCurrentAccount();
  const validateDappAction = useValidateDappAction();
  const [validCandidates, setValidCandidates] = useState<ClaimAllCandidate[]>(
    []
  );
  const chain = protocol.chain;

  const rawCandidates = useMemo(
    () => getClaimAllCandidates(protocol._portfolios || []),
    [protocol._portfolios]
  );
  const rawCandidatesKey = useMemo(
    () => getClaimAllCandidatesKey(rawCandidates),
    [rawCandidates]
  );
  // a refresh returning the same positions must not re-run the validation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const candidates = useMemo(() => rawCandidates, [rawCandidatesKey]);

  useEffect(() => {
    setValidCandidates([]);
    if (!chain || candidates.length < CLAIM_ALL_MIN_ACTIONS) {
      return;
    }
    let isMounted = true;
    Promise.all(
      candidates.map((item) => validateDappAction(item.action, chain))
    ).then((results) => {
      if (isMounted) {
        setValidCandidates(candidates.filter((_, index) => results[index]));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [candidates, chain, validateDappAction]);

  const rewardUsdValue = useMemo(
    () =>
      getClaimAllRewardUsdValue(validCandidates.map((item) => item.portfolio)),
    [validCandidates]
  );

  const key = useMemo(() => getClaimAllCandidatesKey(validCandidates), [
    validCandidates,
  ]);

  const buildTxs = useCallback((): Tx[] => {
    const chainInfo = findChain({ serverId: chain });
    if (!chainInfo || !currentAccount?.address) {
      return [];
    }
    const txs: Tx[] = [];
    for (const item of validCandidates) {
      const tx = buildDappActionTx({
        data: item.action,
        chainId: chainInfo.id,
        chainServerId: chainInfo.serverId,
        from: currentAccount.address,
        protocolName: protocol.name,
      });
      // never send a partial batch
      if (!tx) return [];
      txs.push(tx);
    }
    return txs;
  }, [chain, currentAccount?.address, protocol.name, validCandidates]);

  return {
    visible: validCandidates.length >= CLAIM_ALL_MIN_ACTIONS,
    count: validCandidates.length,
    key,
    rewardUsdValue,
    buildTxs,
  };
};

const ClaimAllHeader = ({
  logo,
  chain,
  title,
  description,
  preExecResults,
}: {
  logo?: string;
  chain?: string;
  title: string;
  description: string;
  preExecResults?: ExplainTxResponse[];
}) => {
  const mergedBalanceChange = useMemo(
    () =>
      preExecResults?.length
        ? mergeBalanceChanges(preExecResults.map((r) => r.balance_change))
        : null,
    [preExecResults]
  );

  return (
    <div className="flex flex-col items-center w-full justify-center mb-[-6px]">
      <div className="flex items-center justify-center w-full">
        <IconWithChain
          iconUrl={logo}
          chainServerId={chain || 'eth'}
          width="24px"
          height="24px"
          isShowChainTooltip
        />
        <div className="ml-[8px] font-medium text-[20px] text-r-neutral-title-1">
          {title}
        </div>
      </div>
      <div
        className={`
          text-[13px] font-medium text-r-blue-default text-center
          px-[16px] py-[10px] mt-[16px] rounded-[8px] bg-r-blue-light1
        `}
      >
        {description}
      </div>
      <div className="w-full mt-[16px] bg-r-neutral-card-2 px-16 py-12 rounded-[8px]">
        {mergedBalanceChange && preExecResults?.length ? (
          <BalanceChange
            version={last(preExecResults)!.pre_exec_version}
            data={mergedBalanceChange}
          />
        ) : (
          <BalanceChangeLoading />
        )}
      </div>
    </div>
  );
};

export const ClaimAllButton = ({
  protocol,
  variant,
  className,
}: {
  protocol: DisplayedProject;
  variant: 'popup' | 'desktop';
  className?: string;
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const currentAccount = useCurrentAccount();
  const { setVisible } = useCommonPopupView();
  const { visible, count, key, rewardUsdValue, buildTxs } = useClaimAllAction(
    protocol
  );
  const [submitting, setSubmitting] = useState(false);
  // claims stay marked as sent until the API reports different positions
  const [submittedKey, setSubmittedKey] = useState<string | null>(null);
  const submitted = submittedKey === key;
  const inFlightRef = useRef(false);
  const runIdRef = useRef(0);
  const simulationRef = useRef<{ usdValueChange?: number }>({});

  const { openUI, resetGasStore, close, updateConfig } = useMiniSigner({
    account: currentAccount!,
  });

  const canDirectSign = useMemo(
    () => supportedDirectSign(currentAccount?.type || ''),
    [currentAccount?.type]
  );

  const title = t('component.DappActions.claimAll');
  const description = t('component.DappActions.claimAllDescription', {
    count,
  });

  const renderHeader = useCallback(
    (preExecResults?: ExplainTxResponse[]) => (
      <ClaimAllHeader
        logo={protocol.logo}
        chain={protocol.chain}
        title={title}
        description={description}
        preExecResults={preExecResults}
      />
    ),
    [description, protocol.chain, protocol.logo, title]
  );

  const handleSubmit = useCallback(async () => {
    if (inFlightRef.current || submitted) return;
    const txs = buildTxs();
    if (txs.length < CLAIM_ALL_MIN_ACTIONS) return;

    inFlightRef.current = true;
    setSubmitting(true);
    const runId = ++runIdRef.current;
    const claimKey = key;
    simulationRef.current = {};
    const base = {
      tx_type: 'claim_all',
      chain: protocol.chain || '',
      user_addr: currentAccount?.address || '',
      address_type: currentAccount?.type || '',
      protocol_name: protocol.name || '',
      app_version: process.env.release || '0',
      create_at: Date.now(),
    } as const;
    const getSimulationFields = () => {
      const s = simulationRef.current;
      return {
        simulation_result:
          typeof s.usdValueChange === 'number' ? s.usdValueChange : '',
      } as const;
    };

    const onPreExecChange = (
      _: ExplainTxResponse,
      all: ExplainTxResponse[]
    ) => {
      // a cancelled run can still finish its simulation, ignore it
      if (runId !== runIdRef.current) return;
      simulationRef.current = {
        usdValueChange: all?.reduce(
          (acc, r) =>
            acc +
            (r?.balance_change?.receive_token_list || []).reduce(
              (sum, token) => sum + (Number(token.usd_value) || 0),
              0
            ),
          0
        ),
      };
      updateConfig({
        title: renderHeader(all),
        disableSignBtn: !isClaimAllPreExecValid(all, txs.length),
      });
    };

    try {
      if (canDirectSign && currentAccount) {
        resetGasStore();
        close();
        try {
          const hashes = await openUI({
            txs,
            title: renderHeader(),
            // the merged balance change of every tx is rendered in the title
            showSimulateChange: false,
            // fail closed until every tx has been simulated
            disableSignBtn: true,
            onPreExecChange,
            onRedirectToDeposit: () => {
              setVisible(false);
            },
            ga: {
              category: 'DappActions',
              action: title,
            },
          });
          setSubmittedKey(claimKey);
          const hash = last(hashes);
          stats.report('defiDirectTx', {
            ...base,
            tx_id: typeof hash === 'string' ? hash : '',
            sign_method: 'simple',
            tx_status: 'success',
            ...getSimulationFields(),
          });
          setVisible(false);
        } catch (error) {
          // no fallback here: it would skip the batch simulation check and
          // could send again claims already broadcast by this batch
          if (error !== MINI_SIGN_ERROR.USER_CANCELLED) {
            console.error('Dapp action claim all direct sign error', error);
            message.error(
              typeof (error as any)?.message === 'string'
                ? (error as any).message
                : 'Transaction failed'
            );
          }
        }
        return;
      }

      // accounts without direct signing: one full approval per tx
      let lastHash = '';
      for (const tx of txs) {
        lastHash = await wallet.sendRequest<string>({
          method: 'eth_sendTransaction',
          params: [tx],
        });
        setSubmittedKey(claimKey);
      }
      stats.report('defiDirectTx', {
        ...base,
        tx_id: lastHash || '',
        sign_method: 'full',
        tx_status: 'success',
        ...getSimulationFields(),
      });
      setVisible(false);
    } catch (error) {
      console.error('Dapp action claim all failed:', error);
      message.error(
        typeof (error as any)?.message === 'string'
          ? (error as any).message
          : 'Transaction failed'
      );
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  }, [
    buildTxs,
    canDirectSign,
    close,
    currentAccount,
    key,
    openUI,
    protocol.chain,
    protocol.name,
    renderHeader,
    resetGasStore,
    setVisible,
    submitted,
    title,
    updateConfig,
    wallet,
  ]);

  if (!visible) {
    return null;
  }

  const disabled = submitting || submitted;
  const usdText =
    rewardUsdValue > 0 ? ` · ${formatUsdValue(rewardUsdValue)}` : '';

  if (variant === 'desktop') {
    return (
      <div
        className={clsx(
          'font-medium text-[13px] text-center whitespace-nowrap',
          'px-[12px] h-[28px] leading-[26px] rounded-[6px]',
          'border-[0.5px] border-solid border-r-blue-default text-r-blue-default',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-r-blue-light1',
          className
        )}
        title={t('component.DappActions.claimAllRewards', { count })}
        onClick={(evt) => {
          evt.stopPropagation();
          handleSubmit();
        }}
      >
        {`${title}${usdText}`}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-[12px] px-[12px] pt-[12px]',
        className
      )}
    >
      <div className="text-[13px] text-r-neutral-body truncate min-w-0">
        {t('component.DappActions.claimAllRewards', { count })}
        {rewardUsdValue > 0 ? (
          <span className="ml-[4px] font-medium text-r-neutral-title-1">
            {formatUsdValue(rewardUsdValue)}
          </span>
        ) : null}
      </div>
      <div
        className={clsx(
          'shrink-0 font-medium text-[13px] text-center whitespace-nowrap',
          'px-[16px] h-[32px] leading-[30px] rounded-[6px]',
          'border border-solid border-r-blue-default text-r-blue-default',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:bg-r-blue-light1'
        )}
        onClick={handleSubmit}
      >
        {title}
      </div>
    </div>
  );
};
