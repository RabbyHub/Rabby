import { Button, Skeleton } from 'antd';
import {
  SecurityCheckDecision,
  SecurityCheckResponse,
} from 'background/service/openapi';
import { useTranslation } from 'react-i18next';

import clsx from 'clsx';
import React from 'react';
import IconCheck from 'ui/assets/icon-check.svg';
import IconQuestion from 'ui/assets/icon-question-ghost.svg';
import IconLoading from 'ui/assets/icon-loading.svg';
import { ReactComponent as IconRcWaring } from 'ui/assets/icon-warning.svg';

interface SecurityCheckCardProps {
  loading: boolean;
  data: SecurityCheckResponse | null;
  isReady: boolean;
  status?: SecurityCheckDecision;
  onCheck?: () => void;
}

const SecurityCheckCard = (props: SecurityCheckCardProps) => {
  const { loading, data, isReady, status, onCheck } = props;
  const { t } = useTranslation();

  if (!isReady) {
    return (
      <div className="security-check-card">
        <div className="security-check-card-header items-center mb-0 gap-[12px]">
          <Skeleton.Avatar active style={{ width: 20, height: 20 }} />
          <Skeleton.Input active style={{ width: 84, height: 15 }} />
        </div>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="security-check-card flex gap-[12px] items-center">
        <img src={IconQuestion} className="security-check-card-icon" />
        <div className="security-check-card-desc flex items-center flex-1">
          <span>Security checks have not been executed</span>
          <span className="security-check-card-btn" onClick={onCheck}>
            Check
          </span>
        </div>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="security-check-card flex gap-[12px] items-center">
        <img
          src={IconLoading}
          className="security-check-card-icon is-loading"
          alt=""
        />
        <div className="security-check-card-text-loading">
          Checking for errors...
        </div>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="security-check-card flex gap-[12px] items-start">
        <IconRcWaring className="security-check-card-icon gray" />
        <div>
          <div className="security-check-card-title mb-[2px]">
            Risk check failed
          </div>
          <div className="security-check-card-desc">
            {data.error?.msg}{' '}
            <span className="number">#{data.error?.code}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.decision === 'pass') {
    return (
      <div className="security-check-card flex gap-[12px] items-center">
        <img src={IconCheck} className="security-check-card-icon" />
        <div className="security-check-card-desc">No risk found</div>
      </div>
    );
  }

  return (
    <div className="security-check-card">
      <div className="security-check-card-header">
        <IconRcWaring
          className={clsx('security-check-card-icon', data.decision)}
        />
        <div className="security-check-card-title">Security risk</div>
      </div>
      {data.forbidden_list?.map((item) => (
        <div key={`forbidden_${item.id}`} className="security-check-card-item">
          <div className="security-check-card-item-icon-wraper">
            <div className="security-check-card-item-icon is-forbidden"></div>
          </div>
          <div>
            {item.alert} <span className="number">#{item.id}</span>
          </div>
        </div>
      ))}

      {data.danger_list.map((item) => (
        <div key={`danger_${item.id}`} className="security-check-card-item">
          <div className="security-check-card-item-icon-wraper">
            <div className="security-check-card-item-icon is-danger"></div>
          </div>
          <div>
            {item.alert} <span className="number">#{item.id}</span>
          </div>
        </div>
      ))}

      {data.warning_list.map((item) => (
        <div key={`warning_${item.id}`} className="security-check-card-item">
          <div className="security-check-card-item-icon-wraper">
            <div className="security-check-card-item-icon is-warning"></div>
          </div>
          <div>
            {item.alert} <span className="number">#{item.id}</span>
          </div>
        </div>
      ))}
      <div className="security-check-card-footer">
        Powered by Web3 Security Engine
      </div>
    </div>
  );
};

export default SecurityCheckCard;
