import React from 'react';
import { LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { AssetApprovalItem, AssetApprovalSpender } from '@/utils/approval';
import { getSpenderApprovalAmount } from '@/utils/approval';
import { AssetAvatar } from '../AssetAvatar';
import { SelectionIndicator } from '../SelectionIndicator';
import { ApprovalAvatar } from '../ApprovalAvatar';
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
}> = ({ amountValue }) => {
  return amountValue ? (
    <div className="text-right text-[13px] leading-[16px] font-medium text-r-neutral-title1">
      {amountValue}
    </div>
  ) : null;
};

type InModalApprovalAssetRowProps = {
  approval: AssetApprovalItem;
  spender: AssetApprovalSpender;
  isSelected: boolean;
  onToggleSelection?: (ctx: {
    spender: AssetApprovalSpender;
    approval: AssetApprovalItem;
  }) => void;
  onOpenLink?: () => void;
};

export const InModalApprovalAssetRow: React.FC<InModalApprovalAssetRowProps> = ({
  approval,
  spender,
  isSelected,
  onToggleSelection,
  onOpenLink,
}) => {
  const { t } = useTranslation();

  const { spenderInfo, spenderValues } = React.useMemo(() => {
    const isNFT = spender.$assetContract?.contractFor !== 'token';

    return {
      spenderInfo: {
        isNFT,
        protocolName: spender.protocol?.name || 'Unknown Contract',
      },
      spenderValues: getSpenderApprovalAmount(spender),
    };
  }, [spender, t]);

  const handleToggleSelection = useMemoizedFn(() => {
    onToggleSelection?.({ spender, approval });
  });

  return (
    <div
      className={clsx(
        'flex items-center justify-between gap-[12px] rounded-[8px] p-[11px] cursor-pointer',
        'border-[1px] hover:border-rabby-blue-default',
        isSelected
          ? 'bg-r-blue-light1 border-rabby-blue-default'
          : 'bg-r-neutral-card1 border-transparent'
      )}
      onClick={handleToggleSelection}
    >
      <div className="flex min-w-0 items-center gap-[12px]">
        <CheckboxV2
          checked={isSelected}
          indeterminate={false}
          onChange={handleToggleSelection}
          className="flex-shrink-0"
        />
        <div className="flex items-center gap-[8px] flex-1 min-w-0">
          <AssetAvatar
            size={28}
            chain={spender.protocol?.chain || approval.chain}
            logo={spender.protocol?.logo_url || ''}
          />

          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
              {spenderInfo.protocolName}
            </div>
            {spender.$assetContract?.type === 'contract' &&
            spender.permit2_id ? (
              <Badge
                label="Via Permit2"
                className="mt-[6px] inline-flex rounded-[4px] px-[8px] py-[2px] text-[12px] leading-[14px] text-r-neutral-foot"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="ml-[8px] shrink-0">
        {!spenderInfo.isNFT ? (
          <ApprovalAmountInfo
            amountValue={
              spenderValues
                ? spenderValues.displayAmount
                : 'amount' in spender
                ? (spender.amount as string)
                : ''
            }
          />
        ) : null}
      </div>
    </div>
  );
};

export const MemoInModalApprovalAssetRow = React.memo(
  InModalApprovalAssetRow,
  (prevProps, nextProps) => {
    return (
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.spender.id === nextProps.spender.id
    );
  }
);
