import { SecurityCheckDecision } from 'background/service/openapi';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import IconDanger from 'ui/assets/danger.svg';
import IconForbidden from 'ui/assets/forbidden.svg';
import IconLoading from 'ui/assets/loading.svg';
import IconPass from 'ui/assets/no-risk.svg';
import IconQuestionMark from 'ui/assets/question-mark-gray-light.svg';
import IconWarning from 'ui/assets/warning.svg';
import { Checkbox } from 'ui/component';

interface ProcessTooltipProps {
  children: ReactNode;
}

const ProcessTooltip = ({ children }: ProcessTooltipProps) => {
  return <div className="process-tooltip">{children}</div>;
};

export default ProcessTooltip;
