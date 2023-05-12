import React from 'react';
import { Props } from './ActionsContainer';
import { useDisplayBrandName } from '@/ui/component/WalletConnect/useDisplayBrandName';
import { useSessionChainId } from '@/ui/component/WalletConnect/useSessionChainId';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { ProcessActions } from './ProcessActions';

export const WalletConnectProcessActions: React.FC<Props> = (props) => {
  const {
    account,
    disabledProcess,
    tooltipContent,
    enableTooltip,
    chain,
  } = props;
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

    return enableTooltip ? tooltipContent : undefined;
  }, [enableTooltip, tooltipContent, status, chainError, displayBrandName]);

  return (
    <ProcessActions
      {...props}
      tooltipContent={content}
      disabledProcess={status !== 'CONNECTED' || chainError || disabledProcess}
    />
  );
};
