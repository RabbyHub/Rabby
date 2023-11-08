import { TransactionGroup } from '@/background/service/transactionHistory';
import { ReactComponent as RcIconCheck } from '@/ui/assets/pending/icon-checked.svg';
import { ellipsisAddress } from '@/ui/utils/address';
import { getTokenSymbol } from '@/ui/utils/token';
import {
  NFTItem,
  PendingTxItem,
  TokenItem,
} from '@rabby-wallet/rabby-api/dist/types';
import clsx from 'clsx';
import _ from 'lodash';
import React, { ReactNode } from 'react';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import {
  ApproveNFTRequireData,
  ApproveTokenRequireData,
  SendRequireData,
  SwapRequireData,
} from '../../../Approval/components/Actions/utils';
import { findChainByServerID } from '@/utils/chain';

export interface FilterItem {
  label: ReactNode | string;
  filter(
    item: PendingTxItem,
    tokenDict?: Record<string, TokenItem | NFTItem>
  ): boolean;
  key: string;
}

const createContractFilter = ({
  protocol,
  spender,
}: {
  protocol?: {
    name: string;
    logo_url?: string;
  } | null;
  spender: string;
}) => {
  return {
    label: `Interact Contract: ${protocol?.name || ellipsisAddress(spender)}`,
    filter: (item: PendingTxItem) => {
      return item.to_addr === spender;
    },
    key: `contractFilter-${spender}`,
  };
};

export const createFilter = (tx: TransactionGroup) => {
  const results: FilterItem[] = [];

  if (tx.action?.actionData?.send) {
    const requiredData = tx.action?.requiredData as SendRequireData;
    results.push({
      label: 'Action: Send Token',
      filter: (item: PendingTxItem) => {
        return item.action_type === 'send_token';
      },
      key: 'sendTokenFilter',
    });
    if (requiredData.cex) {
      results.push({
        label: `Send To Cex`,
        filter: (item: PendingTxItem) => {
          return !!item.to_addr_desc?.cex;
        },
        key: 'sendToCexFilter',
      });
    }
  }
  if (tx.action?.actionData?.swap) {
    const requiredData = tx.action?.requiredData as SwapRequireData;
    results.push({
      label: `Action: Swap Token`,
      filter: (item: PendingTxItem) => {
        return item.action_type === 'swap_token';
      },
      key: 'swapFilter',
    });
  }

  if (
    tx.action?.actionData?.swap ||
    tx.action?.actionData?.crossSwapToken ||
    tx.action?.actionData?.crossToken
  ) {
    const requiredData = tx.action?.requiredData as SwapRequireData;

    if (requiredData?.id) {
      results.push(
        createContractFilter({
          protocol: requiredData?.protocol,
          spender: requiredData?.id,
        })
      );
    }
  }
  if (tx.action?.actionData?.approveToken) {
    const requiredData = tx.action?.requiredData as ApproveTokenRequireData;
    results.push({
      label: `Approve To: ${
        requiredData?.protocol?.name || ellipsisAddress(requiredData?.token?.id)
      }`,
      filter: (item: PendingTxItem) => {
        return (
          item.action_type === 'approve_token' &&
          item.to_addr === requiredData?.token?.id
        );
      },
      key: `approveTokenFilter-${requiredData?.token?.id}`,
    });
  }
  if (tx.action?.actionData?.approveNFT) {
    const requiredData = tx.action?.requiredData as ApproveNFTRequireData;
    const spender = tx?.action?.actionData?.approveNFT?.spender;
    results.push({
      label: `Approve To: ${
        requiredData?.protocol?.name || ellipsisAddress(spender)
      }`,
      filter: (item: PendingTxItem) => {
        return item.action_type === 'approve_nft' && item.to_addr === spender;
      },
      key: `approveNFTFilter-${spender}`,
    });
  }
  if (tx.action?.actionData?.approveNFTCollection) {
    const requiredData = tx.action?.requiredData as ApproveNFTRequireData;
    const spender = tx?.action?.actionData?.approveNFTCollection?.spender;
    results.push({
      label: `Approve To: ${
        requiredData?.protocol?.name || ellipsisAddress(spender)
      }`,
      filter: (item: PendingTxItem) => {
        return (
          item.action_type === 'approve_collection' && item.to_addr === spender
        );
      },
      key: `approveCollectionFilter-${spender}`,
    });
  }

  if (tx.action?.actionData?.revokeNFT) {
    const requiredData = tx.action?.requiredData as ApproveNFTRequireData;
    const spender = tx?.action?.actionData?.revokeNFT?.spender;
    if (spender) {
      results.push(
        createContractFilter({
          protocol: requiredData?.protocol,
          spender: spender,
        })
      );
    }
  }

  if (tx.action?.actionData?.revokeNFTCollection) {
    const requiredData = tx.action?.requiredData as ApproveNFTRequireData;
    const spender = tx?.action?.actionData?.revokeNFTCollection?.spender;
    if (spender) {
      results.push(
        createContractFilter({
          protocol: requiredData?.protocol,
          spender: spender,
        })
      );
    }
  }
  if (tx.action?.actionData?.revokeToken) {
    const requiredData = tx.action?.requiredData as ApproveNFTRequireData;
    const spender = tx?.action?.actionData?.revokeToken?.spender;
    if (spender) {
      results.push(
        createContractFilter({
          protocol: requiredData?.protocol,
          spender: spender,
        })
      );
    }
  }

  if (
    tx.action?.actionData?.crossSwapToken ||
    tx.action?.actionData?.crossToken
  ) {
    const parsedData =
      tx.action?.actionData?.crossSwapToken ||
      tx.action?.actionData?.crossToken;
    const token = parsedData?.receiveToken;
    const requiredData = tx.action?.requiredData;
    if (token) {
      const chain = findChainByServerID(parsedData?.receiveToken?.chain);
      results.push({
        label: (
          <div className="inline-flex items-center gap-[6px]">
            <img
              src={token.logo_url || IconUnknown}
              className="w-[16px] h-[16px]"
              alt=""
            />
            {getTokenSymbol(token)} on {chain?.name}
          </div>
        ),
        filter: (item: PendingTxItem) => {
          return !!(
            item.action_data &&
            'receive_token' in item.action_data &&
            item.action_data.receive_token.id === token.id &&
            item.action_data.receive_token.chain === token.chain
          );
        },
        key: `crossChainFilter-${token.id}-${token.chain}`,
      });
    }
  }

  const tokenList = (tx.explain?.balance_change?.send_token_list || []).concat(
    tx.explain?.balance_change?.receive_token_list || []
  );
  if (tokenList.length > 0) {
    tokenList.forEach((token) => {
      results.push({
        label: (
          <div className="inline-flex items-center gap-[6px]">
            <img
              src={token.logo_url || IconUnknown}
              className="w-[16px] h-[16px]"
              alt=""
            />
            {getTokenSymbol(token)}
          </div>
        ),
        filter: (item: PendingTxItem) => {
          const list = (
            item.pre_exec_result?.balance_change?.send_token_list || []
          ).concat(
            item.pre_exec_result?.balance_change?.receive_token_list || []
          );
          return !!list.find((t) => t.token_id === token.id);
        },
        key: `tokenFilter-${token.id}-${token.chain}`,
      });
    });
  }

  const nftList = _.uniqBy(
    (tx.explain?.balance_change?.send_nft_list || []).concat(
      tx.explain?.balance_change?.receive_nft_list || []
    ),
    'collection_id'
  );

  if (nftList.length > 0) {
    nftList.forEach((nft) => {
      results.push({
        label: `Collection: ${
          nft.collection?.name || ellipsisAddress(nft.contract_id)
        }`,
        filter: (item: PendingTxItem, tokenDict) => {
          const list = (
            item.pre_exec_result?.balance_change?.send_nft_list || []
          ).concat(
            item.pre_exec_result?.balance_change?.receive_nft_list || []
          );

          return !!list.find((t) => {
            const uuid = `${t.chain || 'eth'}:${t.token_id}`;
            const n = tokenDict?.[uuid] as NFTItem;
            return n?.contract_id === nft.contract_id;
          });
        },
        key: `nftFilter-${nft.contract_id}-${nft.chain}`,
      });
    });
  }

  return results;
};

export const Filters = ({
  tx,
  value,
  onChange,
  options,
  stat,
}: {
  tx?: TransactionGroup;
  value: FilterItem[];
  onChange: (v: FilterItem[]) => void;
  options: FilterItem[];
  stat: Record<string, number>;
}) => {
  return (
    <div className="flex flex-wrap gap-[12px]">
      {options.map((item) => {
        return (
          <div
            key={item.key}
            className={clsx(
              'flex items-center gap-[6px] px-[8px] py-[9px] rounded-[4px] cursor-pointer border border-[0.5px]',
              'hover:border-[#7084FF]',
              value.find((i) => i.key === item.key)
                ? 'border-[#7084FF] bg-r-blue-light-1 text-r-blue-default'
                : 'border-[#D3D8E0] text-r-neutral-title-1'
            )}
            onClick={() => {
              if (value.find((i) => i.key === item.key)) {
                onChange(value.filter((v) => v.key !== item.key));
              } else {
                onChange([...value, item]);
              }
            }}
          >
            <RcIconCheck />
            <div className=" text-[13px] leading-[16px] font-medium flex items-center">
              {item.label}&nbsp;
              <span className="font-normal">({stat[item.key] || 0})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
