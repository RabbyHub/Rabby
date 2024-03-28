import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { status } = useSessionStatus(account);
  const sessionChainId = useSessionChainId(account);
  const chainError = chain && sessionChainId !== chain.id;
  const [displayBrandName] = useDisplayBrandName(
    account.brandName,
    account.address
  );
  const content = React.useMemo(() => {
    if (status === 'ACCOUNT_ERROR') {
      return t('page.signFooterBar.walletConnect.wrongAddressAlert');
    }

    if (!status || status === 'DISCONNECTED') {
      return t('page.signFooterBar.walletConnect.connectBeforeSign', [
        displayBrandName,
      ]);
    }

    // if (chainError) {
    //   return t('page.signFooterBar.walletConnect.chainSwitched', [chain.name]);
    // }

    return enableTooltip ? tooltipContent : undefined;
  }, [enableTooltip, tooltipContent, status, chainError, displayBrandName]);

  return (
    <ProcessActions
      {...props}
      tooltipContent={content}
      disabledProcess={
        (status !== 'CONNECTED' && status !== 'CHAIN_CHANGED') ||
        // chainError ||
        disabledProcess
      }
    />
  );
};
