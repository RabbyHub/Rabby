import {
  ComplexProtocol,
  ExplainTxResponse,
  Tx,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { message } from 'antd';
import { useDappAction } from './hook';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useTranslation } from 'react-i18next';
import { useMiniSignGasStore } from '@/ui/hooks/miniSignGasStore';
import { Value } from '@/ui/views/DesktopProfile/components/TokensTabPane/Protocols/components';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';

const Wrapper = styled.div`
  margin-left: 10px;
`;

interface ActionButtonProps {
  className?: string;
  text: string;
  onClick: () => void;
}

export const enum ActionType {
  Withdraw = 'withdraw',
  Claim = 'claim',
  Queue = 'queue',
}

const ActionButton = ({ text, onClick, className }: ActionButtonProps) => {
  return (
    <div
      className={`
        cursor-pointer text-r-blue-default font-medium text-[12px] text-center
        px-[12px] w-min
        h-[24px] leading-[24px]
        border-[0.5px] border-r-blue-default rounded-[4px]
        hover:bg-r-blue-light1
        ${className}
      `}
      onClick={onClick}
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

const DappActions = ({
  data,
  chain,
  protocolLogo,
  type,
}: {
  data?: WithdrawAction[];
  chain?: string;
  protocolLogo?: string;
  type: 'withdraw' | 'claim';
}) => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { setVisible } = useCommonPopupView();

  const { openUI, resetGasStore, close, updateConfig } = useMiniSigner({
    account: currentAccount!,
  });

  const targetAction = useMemo(() => {
    if (type === 'withdraw') {
      return data?.find(
        (item) =>
          item.type === ActionType.Withdraw || item.type === ActionType.Queue
      );
    } else {
      return data?.find((item) => item.type === ActionType.Claim);
    }
  }, [data, type]);

  const isQueueWithdraw = useMemo(
    () => targetAction?.type === ActionType.Queue,
    [targetAction?.type]
  );

  const { valid: show, action } = useDappAction(targetAction, chain);

  const onPreExecChange = useCallback(
    (r: ExplainTxResponse) => {
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
    [isQueueWithdraw]
  );

  const canDirectSign = useMemo(
    () => supportedDirectSign(currentAccount?.type || ''),
    [currentAccount?.type]
  );

  const handleSubmit = useCallback(
    async (action: () => Promise<Tx[]>, title?: string) => {
      const txs = await action();
      if (!txs?.length) return;

      const runFallback = async () => {
        for (const tx of txs) {
          await wallet.sendRequest<string>({
            method: 'eth_sendTransaction',
            params: [tx],
          });
        }
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
          onPreExecChange,
          onRedirectToDeposit: () => {
            setVisible(false);
          },
          ga: {
            category: 'DappActions',
            action: title,
          },
        } as const;
        try {
          await openUI(signerConfig);
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
      isQueueWithdraw,
      t,
      onPreExecChange,
      setVisible,
      wallet,
    ]
  );

  if (!show) {
    return <Value.String key={`dapp-actions-${type}`} value="" />;
  }

  return (
    <Wrapper>
      <ActionButton
        text={
          type === 'withdraw'
            ? t('component.DappActions.withdraw')
            : t('component.DappActions.claim')
        }
        onClick={() =>
          handleSubmit(
            action,
            type === 'withdraw'
              ? t('component.DappActions.withdraw')
              : t('component.DappActions.claim')
          )
        }
      />
    </Wrapper>
  );
};

export default DappActions;
