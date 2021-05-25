import React from 'react';
import { SecurityCheckDecision } from 'background/service/openapi';
import IconLoading from 'ui/assets/loading.svg';
import IconPass from 'ui/assets/checked.svg';
import IconWarning from 'ui/assets/warning.svg';
import IconDanger from 'ui/assets/danger.svg';
import IconForbidden from 'ui/assets/forbidden.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';

const STATUS = {
  loading: {
    name: 'loading',
    color: '#818A99',
    clickable: false,
    icon: IconLoading,
  },
  pass: {
    name: 'pass',
    color: '#27C193',
    clickable: false,
    icon: IconPass,
  },
  warning: {
    name: 'warning',
    color: '#F29C1B',
    clickable: true,
    icon: IconWarning,
  },
  danger: {
    name: 'danger',
    color: '#F24822',
    clickable: true,
    icon: IconDanger,
  },
  forbidden: {
    name: 'forbidden',
    color: '#AF160E',
    clickable: true,
    icon: IconForbidden,
  },
};

interface SecurityCheckBarProps {
  status: SecurityCheckDecision;
  alert: string;
  onClick?(): void;
}

const SecurityCheckBar = ({
  status,
  alert,
  onClick,
}: SecurityCheckBarProps) => {
  return (
    <div
      className="security-check-bar"
      style={{
        color: STATUS[status].color,
        cursor: STATUS[status].clickable && onClick ? 'pointer' : 'inherit',
      }}
      onClick={() => STATUS[status].clickable && onClick && onClick()}
    >
      <img
        src={STATUS[status].icon}
        alt={STATUS[status].name}
        className="icon icon-status"
      />
      <span className="alert">{alert}</span>
      {STATUS[status].clickable && (
        <img src={IconArrowRight} className="icon icon-arrow-right" />
      )}
    </div>
  );
};

export default SecurityCheckBar;
