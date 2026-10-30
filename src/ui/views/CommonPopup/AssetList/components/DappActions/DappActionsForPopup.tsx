import {
  ExplainTxResponse,
  PortfolioItem,
  Tx,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { message } from 'antd';
import {
  findTypedWithdrawAction,
  useDappAction,
  useDappActionRequest,
} from './hook';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useTranslation } from 'react-i18next';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import stats from '@/stats';
import { last } from 'lodash';

const Wrapper = styled.div`
  display: flex;
  gap: 12px;
  padding-top: 12px;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 16px;
`;

interface ActionButtonProps {
  className?: string;
  text: string;
  disabled?: boolean;
  onClick: () => void;
}

export const enum ActionType {
  Withdraw = 'withdraw',
  Claim = 'claim',
  Queue = 'queue',
}

const ActionButton = ({
  text,
  onClick,
  className,
  disabled,
}: ActionButtonProps) => {
  return (
    <div
      className={`
        cursor-pointer text-r-blue-default font-medium text-[13px] text-center
        h-[36px] leading-[34px]
        border border-r-blue-default rounded-[6px]
        hover:bg-r-blue-light1
        ${disabled ? 'opacity-60 pointer-events-none' : ''}
        ${className}
      `}
      onClick={disabled ? undefined : onClick}
    >
      {text}
    </div>
  );
};

const DappActionHeader = ({
  logo,
  chain,
  title,
  description,
}: {
  logo?: string;
  chain?: string;
  title?: string;
  description?: string;
}) => {
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
      {!!description && (
        <div
          className={`
          text-[13px] font-medium text-r-blue-default text-center
          px-[16px] py-[10px] mt-[16px] rounded-[8px] bg-r-blue-light1
        `}
        >
          {description}
        </div>
      )}
    </div>
  );
};

const DappActionsForPopup = ({
  portfolio,
  chain,
  protocolLogo,
  protocolName,
}: {
  portfolio: PortfolioItem;
  chain?: string;
  protocolLogo?: string;
  protocolName?: string;
}) => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { setVisible } = useCommonPopupView();

  const { openUI, resetGasStore, close, updateConfig } = useMiniSigner({
    account: currentAccount!,
  });

  const simulationRef = React.useRef<{
    usdValueChange?: number;
  }>({});
  const { valid: showWithdraw, action } = useDappAction(
    findTypedWithdrawAction(portfolio.withdraw_actions, 'withdraw'),
    chain,
    protocolName
  );
  const { valid: showClaim } = useDappAction(
    findTypedWithdrawAction(portfolio.withdraw_actions, 'claim'),
    chain,
    protocolName
  );
  const { pending, run } = useDappActionRequest(portfolio, action);

  const onPreExecChange = useCallback(
    (r: ExplainTxResponse, isQueueWithdraw: boolean) => {
      const totalReceiveUsdValue = r?.balance_change?.receive_token_list?.reduce(
        (acc, token) => {
          return acc + (Number(token.usd_value) || 0);
        },
        0
      );
      simulationRef.current = {
        usdValueChange: totalReceiveUsdValue,
      };
      if (!r.pre_exec.success) {
        updateConfig({
          disableSignBtn: true,
        });
        return;
      }
      if (
        !r?.balance_change?.receive_nft_list?.length &&
        !r?.balance_change?.receive_token_list?.length
      ) {
        // queue withdraw not need to check balance change
        if (!isQueueWithdraw) {
          updateConfig({
            disableSignBtn: true,
          });
          return;
        }
      }
      updateConfig({
        disableSignBtn: false,
      });
    },
    [updateConfig]
  );

  const canDirectSign = useMemo(
    () => supportedDirectSign(currentAccount?.type || ''),
    [currentAccount?.type]
  );

  const handleSubmit = useCallback(
    async (txs: Tx[], actionType: WithdrawAction['type']) => {
      const isQueueWithdraw = actionType === ActionType.Queue;
      const title = t(
        `component.DappActions.${isQueueWithdraw ? 'withdraw' : actionType}`
      );
      simulationRef.current = {};

      const now = Date.now();
      const base = {
        tx_type: actionType,
        chain: chain || '',
        user_addr: currentAccount?.address || '',
        address_type: currentAccount?.type || '',
        protocol_name: protocolName || '',
        create_at: now,
        app_version: process.env.release || '0',
      } as const;

      const getSimulationFields = () => {
        const s = simulationRef.current;
        return {
          simulation_result:
            typeof s.usdValueChange === 'number' ? s.usdValueChange : '',
        } as const;
      };

      const runFallback = async () => {
        let lastHash = '';
        for (const tx of txs) {
          lastHash = await wallet.sendRequest<string>({
            method: 'eth_sendTransaction',
            params: [tx],
          });
        }
        stats.report('defiDirectTx', {
          ...base,
          sign_method: 'full',
          tx_id: lastHash || '',
          ...getSimulationFields(),
        });
        setVisible(false);
      };

      if (canDirectSign && currentAccount) {
        resetGasStore();
        close();
        const signerConfig = {
          txs,
          title: (
            <DappActionHeader
              logo={protocolLogo}
              chain={chain}
              title={title}
              description={
                isQueueWithdraw
                  ? t('component.DappActions.queueDescription')
                  : undefined
              }
            />
          ),
          showSimulateChange: true,
          disableSignBtn: false,
          onPreExecChange: (r: ExplainTxResponse) =>
            onPreExecChange(r, isQueueWithdraw),
          onRedirectToDeposit: () => {
            setVisible(false);
          },
          ga: {
            category: 'DappActions',
            action: title,
          },
        } as const;
        try {
          const hashes = await openUI(signerConfig);
          const hash = last(hashes);
          stats.report('defiDirectTx', {
            ...base,
            sign_method: 'simple',
            tx_id: typeof hash === 'string' ? hash : '',
            ...getSimulationFields(),
          });
          setVisible(false);
          return;
        } catch (error) {
          console.log('Dapp actions openUI error', error);
          if (error !== MINI_SIGN_ERROR.USER_CANCELLED) {
            console.error('Dapp action direct sign error', error);
            await runFallback().catch((fallbackError) => {
              console.error('Dapp action fallback error', fallbackError);
              const fallbackMsg =
                typeof (fallbackError as any)?.message === 'string'
                  ? (fallbackError as any).message
                  : 'Transaction failed';
              message.error(fallbackMsg);
            });
          }
          return;
        }
      }

      try {
        await runFallback();
      } catch (error) {
        console.error('Transaction failed:', error);
        message.error(
          typeof error?.message === 'string'
            ? error?.message
            : 'Transaction failed'
        );
      }
    },
    [
      canDirectSign,
      currentAccount,
      openUI,
      protocolLogo,
      chain,
      protocolName,
      t,
      onPreExecChange,
      setVisible,
      wallet,
    ]
  );

  if (!showWithdraw && !showClaim) {
    return null;
  }

  return (
    <Wrapper>
      {showWithdraw && (
        <ActionButton
          disabled={pending}
          text={t('component.DappActions.withdraw')}
          className={`${showClaim ? 'w-[216px]' : 'flex-1'}`}
          onClick={() => run('withdraw', handleSubmit)}
        />
      )}
      {showClaim && (
        <ActionButton
          disabled={pending}
          text={t('component.DappActions.claim')}
          className={`${showWithdraw ? 'w-[108px]' : 'flex-1'}`}
          onClick={() => run('claim', handleSubmit)}
        />
      )}
    </Wrapper>
  );
};

export default DappActionsForPopup;
