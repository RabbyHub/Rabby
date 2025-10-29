import React from 'react';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
import { Table } from './table';
import DappActions, {
  ActionType,
} from '@/ui/views/CommonPopup/AssetList/components/DappActions';
import { Value } from '.';

export const hasActions = (
  portfolio: PortfolioItem,
  type?: 'withdraw' | 'claim'
) => {
  if (
    portfolio?.proxy_detail?.proxy_contract_id ||
    !portfolio?.withdraw_actions?.length
  ) {
    return false;
  }
  if (!type) {
    return portfolio.withdraw_actions.length > 0;
  }
  if (type === 'withdraw') {
    return portfolio.withdraw_actions?.some(
      (item) =>
        item.type === ActionType.Withdraw || item.type === ActionType.Queue
    );
  }
  if (type === 'claim') {
    return portfolio.withdraw_actions?.some(
      (item) => item.type === ActionType.Claim
    );
  }
  return false;
};

interface ActionRowProps {
  actionKeys: ('withdraw' | 'claim' | 'default' | '')[]; // default 占位，空字符串不现实
  portfolio: PortfolioItem;
  protocolLogo: string;
  className?: string;
}
export const ActionRow = ({
  actionKeys,
  portfolio,
  protocolLogo,
  className,
}: ActionRowProps) => {
  return (
    <Table.Row key={`${portfolio?.name}`} className={className}>
      {actionKeys.filter(Boolean).map((key, index) => {
        if (key === 'withdraw') {
          return (
            <DappActions
              key="withdraw"
              data={portfolio?.withdraw_actions}
              chain={portfolio?.pool.chain}
              type="withdraw"
              protocolLogo={protocolLogo}
            />
          );
        }
        if (key === 'claim') {
          return (
            <DappActions
              key="claim"
              data={portfolio?.withdraw_actions}
              chain={portfolio?.pool.chain}
              type="claim"
              protocolLogo={protocolLogo}
            />
          );
        }
        if (key === 'default') {
          return <Value.String key={`${portfolio?.name}_${index}`} value="" />;
        }
        return null;
      })}
    </Table.Row>
  );
};
