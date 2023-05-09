import { Button, Tooltip } from 'antd';
import React from 'react';
import { ActionsContainer } from './ActionsContainer';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { Account } from '@/background/service/preference';
import { useSessionChainId } from '@/ui/component/WalletConnect/useSessionChainId';
import { Chain } from '@debank/common';
import clsx from 'clsx';
import { useDisplayBrandName } from '@/ui/component/WalletConnect/useDisplayBrandName';

export interface Props {
  onProcess(): void;
  onCancel(): void;
  account: Account;
  disabledProcess: boolean;
  enableTooltip?: boolean;
  tooltipContent?: string;
  chain?: Chain;
}

export const ProcessActions: React.FC<Props> = ({
  onProcess,
  onCancel,
  account,
  disabledProcess,
  tooltipContent,
  enableTooltip,
  chain,
}) => {
  const { status } = useSessionStatus(account);
  const sessionChainId = useSessionChainId(account);
  const chainError = chain && sessionChainId !== chain.id;
  const [displayBrandName] = useDisplayBrandName(
    account.brandName,
    account.address
  );
  const content = React.useMemo(() => {
    if (status === 'ACCOUNT_ERROR') {
      return "You've switched to a different address on mobile wallet. Please switch to the correct address in mobile wallet";
    }

    if (!status || status === 'DISCONNECTED') {
      return `${displayBrandName} is not connected to Rabby, please connect before signing`;
    }

    if (chainError) {
      return `You've switched to a different chain on mobile wallet. Please switch to ${chain.name} in mobile wallet`;
    }

    return enableTooltip ? tooltipContent : null;
  }, [enableTooltip, tooltipContent, status, chainError, displayBrandName]);

  return (
    <ActionsContainer onClickCancel={onCancel}>
      <Tooltip
        overlayClassName="rectangle sign-tx-forbidden-tooltip"
        title={content}
      >
        <div>
          <Button
            disabled={status !== 'CONNECTED' || chainError || disabledProcess}
            type="ghost"
            className={clsx(
              'w-[244px] h-[48px] border-blue-light text-blue-light',
              'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
              'disabled:bg-transparent disabled:opacity-40 disabled:hover:bg-transparent',
              'rounded-[8px]',
              'before:content-none'
            )}
            onClick={onProcess}
          >
            Begin signing process
          </Button>
        </div>
      </Tooltip>
    </ActionsContainer>
  );
};
