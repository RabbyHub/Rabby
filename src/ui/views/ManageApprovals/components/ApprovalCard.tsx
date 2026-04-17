import React from 'react';
import { RightOutlined } from '@ant-design/icons';

import { RiskBanner } from './RiskBanner';
import { AssetAvatar } from './AssetAvatar';
import { CheckboxV2 } from '../../DesktopSmallSwap/components/Checkbox';
import styled from 'styled-components';
import clsx from 'clsx';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';

const Container = styled.div`
  width: 100%;
  min-height: 56px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--r-neutral-card1, #fff);

  &.is-danger {
    border-radius: 8px;
    border-color: var(--r-red-default, #e34935);
    background: var(--r-red-light, #fff2f0);
  }

  &:not(.is-danger).is-selected {
    border-color: var(--r-blue-default, #4c65ff);
    background: var(--r-blue-light1, #edf0ff);
  }
  &:not(.is-danger):hover {
    border-color: var(--r-blue-default, #4c65ff);
  }
`;

type ApprovalCardProps = {
  selected: boolean;
  partial: boolean;
  title: string;
  logoUrl?: string | null;
  chainServerId?: string;
  count: number;
  riskyText?: string;
  selectedBackground?: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
  badge?: React.ReactNode;
  isNFT?: boolean;
};

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  selected,
  partial,
  title,
  logoUrl,
  chainServerId,
  count,
  riskyText,
  selectedBackground,
  onToggle,
  onOpenDetail,
  badge,
  isNFT,
}) => {
  const isRisky = Boolean(riskyText);

  return (
    <Container
      className={clsx({
        'is-danger': isRisky,
        'is-selected': selectedBackground,
      })}
      onClick={onToggle}
    >
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center gap-[12px] flex-1 px-[11px] py-[13px] min-w-0">
          <CheckboxV2
            checked={selected}
            indeterminate={partial}
            onChange={onToggle}
            className="flex-shrink-0"
          />
          <div className="flex items-center gap-[8px] min-w-0 flex-1">
            <AssetAvatar
              chain={chainServerId}
              logo={logoUrl}
              size={28}
              logoStyle={isNFT ? { borderRadius: 4 } : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] leading-[18px] font-medium  text-r-neutral-title1">
                {title}
              </div>
              {badge ? badge : null}
            </div>
          </div>
        </div>
        <div
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail();
          }}
          className={clsx(
            'flex shrink-0 items-center px-[11px] py-[13px]',
            'text-[13px] leading-[16px] font-medium text-r-neutral-title1'
          )}
        >
          {count} approvals
          <RcIconArrowRightCC />
        </div>
      </div>
      <RiskBanner text={riskyText} className="mx-[11px] mb-[13px]" />
    </Container>
  );
};
