import {
  ComplexProtocol,
  ExplainTxResponse,
  Tx,
  WithdrawAction,
} from '@rabby-wallet/rabby-api/dist/types';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDappAction } from './hook';
import { MiniApproval } from '@/ui/views/Approval/components/MiniSignTx';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useCommonPopupView, useWallet } from '@/ui/utils';
import { IconWithChain } from '@/ui/component/TokenWithChain';
import { useTranslation } from 'react-i18next';
import { useMiniSignGasStore } from '@/ui/hooks/miniSignGasStore';

const Wrapper = styled.div`
  display: flex;
  gap: 12px;
  padding-left: 12px;
  padding-right: 12px;
  padding-bottom: 16px;
`;

interface ActionButtonProps {
  className?: string;
  text: string;
  onClick: () => void;
}

const ActionButton = ({ text, onClick, className }: ActionButtonProps) => {
  return (
    <div
      className={`
        cursor-pointer text-r-blue-default font-medium text-[13px] text-center
        h-[36px] leading-[34px]
        border border-r-blue-default rounded-[6px]
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
}: {
  logo?: string;
  chain?: string;
  title?: string;
}) => {
  return (
    <div className="flex items-center w-full justify-center">
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
  );
};

const DappActions = ({
  data,
  chain,
  protocolLogo,
  onRefreshProtocol,
}: {
  data?: WithdrawAction[];
  chain?: string;
  protocolLogo?: string;
  onRefreshProtocol: () => Promise<ComplexProtocol | undefined>;
}) => {
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const { t } = useTranslation();
  const { setVisible } = useCommonPopupView();

  const [disabledSign, setDisabledSign] = useState(false);
  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const [miniSignTxs, setMiniSignTxs] = useState<Tx[]>([]);
  const [title, setTitle] = useState<string>('');

  const withdrawActions = useMemo(
    () =>
      data?.filter(
        (item) => !item?.need_approve?.to && item.type === 'withdraw'
      ),
    [data]
  );
  const claimActions = useMemo(
    () =>
      data?.filter((item) => !item?.need_approve?.to && item.type === 'claim'),
    [data]
  );

  const { valid: showWithdraw, action: actionWithdraw } = useDappAction(
    withdrawActions?.[0],
    chain
  );
  const { valid: showClaim, action: actionClaim } = useDappAction(
    claimActions?.[0],
    chain
  );

  const onPreExecChange = useCallback((r: ExplainTxResponse) => {
    if (!r.pre_exec.success) {
      setDisabledSign(true);
      return;
    }
    if (
      !r?.balance_change?.receive_nft_list?.length &&
      !r?.balance_change?.receive_token_list?.length
    ) {
      setDisabledSign(true);
    }
  }, []);

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
        await wallet.sendRequest<string>({
          method: 'eth_sendTransaction',
          params: txs,
        });
      }
    },
    [canDirectSign, wallet]
  );

  if (!showWithdraw && !showClaim) {
    return null;
  }

  return (
    <Wrapper>
      {showWithdraw && (
        <ActionButton
          text="Withdraw"
          className={`${showClaim ? 'w-[216px]' : 'flex-1'}`}
          onClick={() =>
            handleSubmit(actionWithdraw, t('component.DappActions.withdraw'))
          }
        />
      )}
      {showClaim && (
        <ActionButton
          text="Claim"
          className={`${showWithdraw ? 'w-[108px]' : 'flex-1'}`}
          onClick={() =>
            handleSubmit(actionClaim, t('component.DappActions.claim'))
          }
        />
      )}
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
            onRefreshProtocol();
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
          <DappActionHeader logo={protocolLogo} chain={chain} title={title} />
        }
      />
    </Wrapper>
  );
};

export default DappActions;
