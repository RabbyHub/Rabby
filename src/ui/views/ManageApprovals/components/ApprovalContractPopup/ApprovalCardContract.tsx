import React from 'react';
import { LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

import type { ContractApprovalItem } from '../../hooks/useManageApprovalsPage';
import { ellipsisAddress } from '@/ui/utils/address';
import { AssetAvatar } from '../AssetAvatar';
import { RcIconExternal1CC } from '@/ui/assets/dashboard';
import { openNFTLinkFromChainItem } from '../../utils';
import { findChain } from '@/utils/chain';
import { RiskBanner } from '../RiskBanner';
import styled from 'styled-components';
import clsx from 'clsx';

const dangerBg = 'var(--r-red-light1, #fff1f0)';
const dangerBorder = 'var(--r-red-light2, #ffd7d2)';

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
`;

type ApprovalCardContractProps = {
  contract: ContractApprovalItem;
};

export const ApprovalCardContract: React.FC<ApprovalCardContractProps> = ({
  contract,
}) => {
  const { t } = useTranslation();

  const chainItem = React.useMemo(
    () => findChain({ serverId: contract.chain }),
    [contract.chain]
  );

  const isRisky = React.useMemo(
    () => ['danger', 'warning'].includes(contract.risk_level),
    [contract.risk_level]
  );

  return (
    <Container
      className={clsx('shrink-0 rounded-[8px] p-[16px]', {
        'is-danger': isRisky,
      })}
    >
      <div className="flex items-center justify-center">
        <div className="flex min-w-0 items-center justify-center gap-[8px]">
          <AssetAvatar chain={contract.chain} logo={contract.logo_url} />
          <div className="truncate text-[15px] leading-[18px] font-medium text-r-neutral-title1">
            {contract.name}
          </div>
        </div>
      </div>

      {isRisky && contract.risk_alert ? (
        <RiskBanner
          text={contract.risk_alert}
          className="mx-[-8px] mt-[12px]"
        />
      ) : null}

      <div
        className="mt-[16px] h-[0.5px]"
        style={{
          background: isRisky ? dangerBorder : 'var(--r-neutral-line, #e5e9ef)',
        }}
      />

      <div className="mt-[16px] flex items-center justify-between gap-[12px]">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          {t('page.manageApprovals.ApprovalCardContractPopup.allApprovals')}
        </div>
        <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
          {contract.list.length}
        </div>
      </div>

      <div className="mt-[12px] flex items-center justify-between gap-[12px]">
        <div className="text-[13px] leading-[16px] text-r-neutral-foot">
          {t('page.manageApprovals.ApprovalCardContractPopup.contractAddress')}
        </div>
        <div
          className="flex min-w-0 items-center gap-[4px] cursor-pointer"
          onClick={() => openNFTLinkFromChainItem(chainItem, contract.id)}
        >
          <div className="text-[13px] leading-[16px] font-medium text-r-neutral-title1">
            {ellipsisAddress(contract.id)}
          </div>
          <button
            type="button"
            className="shrink-0 border-none bg-transparent p-0 text-r-neutral-foot"
          >
            <RcIconExternal1CC />
          </button>
        </div>
      </div>
    </Container>
  );
};
