import React from 'react';
import NFTAvatar from '@/ui/views/Dashboard/components/NFT/NFTAvatar';

import type { ContractApprovalItem } from '../../hooks/useManageApprovalsPage';
import {
  checkoutContractSpender,
  getContractNFTType,
  maybeNFTLikeItem,
} from '../../utils';
import { getSpenderApprovalAmount } from '@/utils/approval';
import { getTokenSymbol } from '@/ui/utils/token';
import { AssetAvatar } from '../AssetAvatar';
import { SelectionIndicator } from '../SelectionIndicator';
import { NFTApproval } from '@rabby-wallet/rabby-api/dist/types';
import { ensureSuffix } from '@/utils/string';
import clsx from 'clsx';
import { CheckboxV2 } from '@/ui/views/DesktopSmallSwap/components/Checkbox';
import { useMemoizedFn } from 'ahooks';

const lineColor = 'var(--r-neutral-line, #e5e9ef)';
const brandColor = 'var(--r-blue-default, #7084ff)';
const brandLightColor = 'var(--r-blue-light1, #eef1ff)';

const Badge: React.FC<{ label: string; className?: string }> = ({
  label,
  className,
}) => {
  return (
    <div
      className={className}
      style={{
        border: `1px solid ${lineColor}`,
      }}
    >
      {label}
    </div>
  );
};

const ApprovalAmountInfo: React.FC<{
  amountValue: string | number;
  balanceValue: string | number;
}> = ({ amountValue, balanceValue }) => {
  return (
    <div className="flex flex-col items-end justify-start text-right">
      {amountValue ? (
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-foot">
          {amountValue}
        </div>
      ) : null}
      {balanceValue ? (
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
          {balanceValue}
        </div>
      ) : null}
    </div>
  );
};

type ToggleCtx = {
  spender: ReturnType<typeof checkoutContractSpender>;
  approval: ContractApprovalItem;
  contractApproval: ContractApprovalItem['list'][number];
};

type InModalApprovalContractRowProps = {
  approval: ContractApprovalItem;
  contractApproval: ContractApprovalItem['list'][number];
  isSelected: boolean;
  onToggleSelection?: (ctx: ToggleCtx) => void;
};

export const InModalApprovalContractRow: React.FC<InModalApprovalContractRowProps> = ({
  approval,
  contractApproval,
  isSelected,
  onToggleSelection,
}) => {
  const { spender, associatedSpender } = React.useMemo(() => {
    return {
      spender: checkoutContractSpender(contractApproval),
      associatedSpender:
        '$indexderSpender' in contractApproval
          ? contractApproval.$indexderSpender
          : null,
    };
  }, [contractApproval]);

  const {
    itemName,
    maybeTokenInfo,
    maybeNFTInfo,
    spenderValues,
  } = React.useMemo(() => {
    const maybeContractForNFT = maybeNFTLikeItem(contractApproval);

    const itemName = !maybeContractForNFT
      ? getTokenSymbol(contractApproval)
      : 'inner_id' in contractApproval
      ? ensureSuffix(
          contractApproval.contract_name || 'Unknown',
          ` #${contractApproval.inner_id}`
        )
      : contractApproval.contract_name || 'Unknown';

    const isToken = 'logo_url' in contractApproval;
    const maybeTokenInfo = {
      isToken,
      tokenLogoUrl: isToken ? contractApproval.logo_url : null,
    };

    const maybeNFTInfo = {
      nftBadgeType: !maybeContractForNFT
        ? null
        : getContractNFTType(contractApproval).nftBadgeType,
      nftImageURL:
        (contractApproval as NFTApproval)?.content ||
        ((contractApproval as any)?.collection?.logo_url as string),
    };

    const spenderValues = associatedSpender
      ? getSpenderApprovalAmount(associatedSpender)
      : null;

    return {
      itemName,
      maybeTokenInfo,
      maybeNFTInfo,
      spender,
      spenderValues,
    };
  }, [contractApproval, spender, associatedSpender]);

  const handleToggleSelection = useMemoizedFn(() => {
    onToggleSelection?.({ spender, approval, contractApproval });
  });

  if (!spender) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-[12px] rounded-[8px] p-[11px] cursor-pointer',
        'border-[1px] hover:border-rabby-blue-default',
        isSelected
          ? 'bg-r-blue-light1 border-rabby-blue-default'
          : 'bg-r-neutral-card1 border-transparent'
      )}
    >
      <div
        onClick={handleToggleSelection}
        className="flex min-w-0 flex-1 items-center justify-between gap-[12px] border-none bg-transparent p-0 text-left"
      >
        <div className="flex min-w-0 items-center gap-[12px]">
          <CheckboxV2
            checked={isSelected}
            indeterminate={false}
            onChange={handleToggleSelection}
          />

          {maybeTokenInfo.isToken ? (
            <AssetAvatar
              chain={contractApproval.chain}
              logo={maybeTokenInfo.tokenLogoUrl}
            />
          ) : (
            <NFTAvatar
              className="h-[28px] w-[28px] shrink-0"
              content={maybeNFTInfo.nftImageURL}
              type={(contractApproval as NFTApproval)?.content_type || 'image'}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-[8px]">
              <div
                className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1"
                style={{ maxWidth: associatedSpender?.permit2_id ? 85 : 150 }}
              >
                {itemName}
              </div>
              {associatedSpender?.permit2_id ? (
                <Badge
                  label="Via Permit2"
                  className="shrink-0 rounded-[4px] px-[8px] py-[2px] text-[12px] leading-[14px] text-r-neutral-foot"
                />
              ) : null}
            </div>

            {maybeNFTInfo.nftBadgeType ? (
              <div
                className={clsx(
                  'mt-[6px] inline-flex',
                  'rounded-[4px] px-[6px] py-[2px]',
                  'text-[12px] leading-[12px] text-r-neutral-foot',
                  'border border-rabby-neutral-line'
                )}
              >
                {maybeNFTInfo.nftBadgeType === 'collection'
                  ? 'Collection'
                  : 'NFT'}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-[8px] shrink-0">
          <ApprovalAmountInfo
            amountValue={
              spenderValues
                ? spenderValues.displayAmountText
                : 'amount' in contractApproval
                ? contractApproval.amount
                : ''
            }
            balanceValue={spenderValues ? spenderValues.displayBalanceText : ''}
          />
        </div>
      </div>
    </div>
  );
};

export const MemoInModalApprovalContractRow = React.memo(
  InModalApprovalContractRow,
  (prevProps, nextProps) => {
    const prevSpender = checkoutContractSpender(prevProps.contractApproval);
    const nextSpender = checkoutContractSpender(nextProps.contractApproval);

    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevSpender?.id === nextSpender?.id
    );
  }
);
