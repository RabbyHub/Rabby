import React from 'react';

import { openInTab } from '@/ui/utils';

import { ExternalIcon } from '../icons';
import {
  formatStakingAuditDate,
  getStakingSecurityAudits,
} from '../data/securityAudits';
import type { StakingPool } from '../types';

const AuditFirmBadge = () => (
  <span className="staking-security-auditor-icon" aria-hidden="true" />
);

export const SecurityTab = ({ pool }: { pool: StakingPool }) => {
  const audits = getStakingSecurityAudits(pool);

  return (
    <div className="staking-security-tab">
      <div className="staking-security-title-row">
        <div className="staking-security-title">Certifications</div>
      </div>
      {audits.length ? (
        <div className="staking-security-table">
          <div className="staking-security-header">
            <span>Certified by</span>
            <span>Certified on</span>
            <span className="text-right">Action</span>
          </div>
          <div className="staking-security-rows">
            {audits.map((audit) => (
              <div className="staking-security-row" key={audit.auditReportUrl}>
                <div
                  className="staking-security-auditor"
                  title={audit.auditFirm}
                >
                  <AuditFirmBadge />
                  <span className="min-w-0 truncate">{audit.auditFirm}</span>
                </div>
                <div className="staking-security-date" title={audit.auditScope}>
                  {formatStakingAuditDate(audit.auditDate)}
                </div>
                <button
                  type="button"
                  className="staking-security-action"
                  onClick={() => openInTab(audit.auditReportUrl, false)}
                  title={audit.auditScope}
                >
                  <span>View</span>
                  <ExternalIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="staking-security-empty">No certification data</div>
      )}
    </div>
  );
};
