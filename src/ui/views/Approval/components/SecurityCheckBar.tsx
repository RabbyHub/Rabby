import React from 'react';
import { Button } from 'antd';
import { SecurityCheckDecision } from 'background/service/openapi';
import { useTranslation } from 'react-i18next';
import IconLoading from 'ui/assets/loading.svg';
import IconPass from 'ui/assets/no-risk.svg';
import IconWarning from 'ui/assets/warning.svg';
import IconDanger from 'ui/assets/danger.svg';
import IconForbidden from 'ui/assets/forbidden.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconQuestionMark from 'ui/assets/question-mark-gray-light.svg';

interface SecurityCheckBarProps {
  status: SecurityCheckDecision;
  alert: string;
  onClick?(): void;
  onCheck?(): void;
}

const SecurityCheckBar = ({
  status,
  alert,
  onClick,
  onCheck,
}: SecurityCheckBarProps) => {
  const { t } = useTranslation();
  const STATUS = {
    pending: {
      name: 'pending',
      color: '#707280',
      clickable: false,
      icon: IconQuestionMark,
      text: t('Security checks have not been executed'),
    },
    loading: {
      name: 'loading',
      color: '#707280',
      clickable: false,
      icon: IconLoading,
      text: t('Checking'),
    },
    pass: {
      name: 'pass',
      color: '#707280',
      clickable: false,
      icon: IconPass,
      text: t('No risk found'),
    },
    warning: {
      name: 'warning',
      color: '#F29C1B',
      clickable: true,
      icon: IconWarning,
      text: null,
    },
    danger: {
      name: 'danger',
      color: '#F24822',
      clickable: true,
      icon: IconDanger,
      text: null,
    },
    forbidden: {
      name: 'forbidden',
      color: '#AF160E',
      clickable: true,
      icon: IconForbidden,
      text: null,
    },
  };
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
      <span className="alert">
        {STATUS[status].text || alert}
        {status === 'pending' && (
          <Button onClick={onCheck} ghost>
            {t('Check')}
          </Button>
        )}
      </span>
      {STATUS[status].clickable && (
        <img src={IconArrowRight} className="icon icon-arrow-right" />
      )}
    </div>
  );
};

export default SecurityCheckBar;
