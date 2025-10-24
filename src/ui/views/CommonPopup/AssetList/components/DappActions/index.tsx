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
import { MiniApproval } from '@/ui/views/Approval/components/MiniSignTx';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useTranslation } from 'react-i18next';
import { useMiniSignGasStore } from '@/ui/hooks/miniSignGasStore';
import { Value } from '@/ui/views/DesktopProfile/components/TokensTabPane/Protocols/components';

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

  const [disabledSign, setDisabledSign] = useState(false);
  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const [miniSignTxs, setMiniSignTxs] = useState<Tx[]>([]);
  const [title, setTitle] = useState<string>('');
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
        setDisabledSign(true);
        return;
      }
      if (
        !r?.balance_change?.receive_nft_list?.length &&
        !r?.balance_change?.receive_token_list?.length
      ) {
        // queue withdraw not need to check balance change
        if (!isQueueWithdraw) {
          setDisabledSign(true);
          return;
        }
      }
      setDisabledSign(false);
    },
    [isQueueWithdraw]
  );

  const canDirectSign = useMemo(
    () => supportedDirectSign(currentAccount?.type || ''),
    [currentAccount?.type]
  );

  const { reset: resetGasCache } = useMiniSignGasStore();

  const handleSubmit = useCallback(
    async (action: () => Promise<Tx[]>, title?: string) => {
      const txs = await action();
      if (canDirectSign) {
        setTitle(title || '');
        resetGasCache();
        setMiniSignTxs(txs);
        setIsShowMiniSign(true);
      } else {
        try {
          for await (const tx of txs) {
            await wallet.sendRequest<string>({
              method: 'eth_sendTransaction',
              params: [tx],
            });
          }
          setVisible(false);
        } catch (error) {
          console.error('Transaction failed:', error);
          message.error(
            typeof error?.message === 'string'
              ? error?.message
              : 'Transaction failed'
          );
        }
      }
    },
    [canDirectSign, resetGasCache, setVisible, wallet]
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
      <MiniApproval
        txs={miniSignTxs}
        visible={isShowMiniSign}
        onClose={() => {
          setIsShowMiniSign(false);
          setMiniSignTxs([]);
          resetGasCache();
        }}
        onReject={() => {
          setIsShowMiniSign(false);
          setMiniSignTxs([]);
          resetGasCache();
        }}
        onResolve={() => {
          setTimeout(() => {
            setIsShowMiniSign(false);
            setMiniSignTxs([]);
            resetGasCache();
            setVisible(false);
          }, 500);
        }}
        autoThrowPreExecError={false}
        onRedirectToDeposit={() => {
          setVisible(false);
          setIsShowMiniSign(false);
          setMiniSignTxs([]);
        }}
        canUseDirectSubmitTx
        showSimulateChange
        onPreExecChange={onPreExecChange}
        disableSignBtn={disabledSign}
        title={
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
        }
      />
    </Wrapper>
  );
};

export default DappActions;
