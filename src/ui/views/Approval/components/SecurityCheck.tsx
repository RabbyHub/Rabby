import { SecurityCheckDecision } from 'background/service/openapi';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconDanger from 'ui/assets/danger.svg';
import IconForbidden from 'ui/assets/forbidden.svg';
import IconLoading from 'ui/assets/loading.svg';
import IconPass from 'ui/assets/no-risk.svg';
import IconQuestionMark from 'ui/assets/question-mark-gray-light.svg';
import IconWarning from 'ui/assets/warning.svg';
import { Checkbox } from 'ui/component';

interface SecurityCheckBarProps {
  status: SecurityCheckDecision;
  value?: boolean;
  onChange?(v: boolean): void;
}

const SecurityCheckBar = ({
  status,
  onChange,
  value,
}: SecurityCheckBarProps) => {
  const { t } = useTranslation();
  if (status !== 'forbidden') {
    return null;
  }

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
    <div className="security-check-bar">
      <Checkbox checked={!!value} onChange={(e) => onChange?.(e)}>
        Confirm to sign under{' '}
        <span
          style={{
            textTransform: 'Capitalize',
            color: STATUS[status].color,
          }}
        >
          {STATUS[status]?.name}
        </span>{' '}
        security risk
      </Checkbox>
    </div>
  );
};

export default SecurityCheckBar;
