import React from 'react';
import { useTranslation } from 'react-i18next';

import { openInTab } from '@/ui/utils';

import { ExternalIcon } from '../icons';
import {
  formatStakingAuditDate,
  getStakingAuditFirmLogoUrl,
  getStakingSecurityAudits,
} from '../data/securityAudits';
import type { StakingPool } from '../types';

const AuditFirmBadge = ({ auditFirm }: { auditFirm: string }) => {
  const logoUrl = getStakingAuditFirmLogoUrl(auditFirm);

  return (
    <span className="staking-security-auditor-icon" aria-hidden="true">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
    </span>
  );
};

export const SecurityTab = ({ pool }: { pool: StakingPool }) => {
  const { t } = useTranslation();
  const audits = getStakingSecurityAudits(pool);

  return (
    <div className="staking-security-tab">
      <div className="staking-security-title-row">
        <div className="staking-security-title">
          {t('page.staking.security.certifications')}
        </div>
      </div>
      {audits.length ? (
        <div className="staking-security-table">
          <div className="staking-security-header">
            <span>{t('page.staking.security.certifiedBy')}</span>
            <span>{t('page.staking.security.certifiedOn')}</span>
            <span className="text-right">
              {t('page.staking.security.action')}
            </span>
          </div>
          <div className="staking-security-rows">
            {audits.map((audit) => (
              <div className="staking-security-row" key={audit.auditReportUrl}>
                <div
                  className="staking-security-auditor"
                  title={audit.auditFirm}
                >
                  <AuditFirmBadge auditFirm={audit.auditFirm} />
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
                  <span>{t('page.staking.security.view')}</span>
                  <ExternalIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="staking-security-empty">
          {t('page.staking.security.noCertificationData')}
        </div>
      )}
    </div>
  );
};
