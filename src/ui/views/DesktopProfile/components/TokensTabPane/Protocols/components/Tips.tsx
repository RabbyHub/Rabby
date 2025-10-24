import React, { ReactNode } from 'react';

import { ReactComponent as IconRcQuestion } from 'ui/assets/approval/question.svg';
import { ReactComponent as IconRcQuestionGhost } from 'ui/assets/icon-info.svg';
import styled from 'styled-components';

import HelperTooltip from './HelperTooltip';

const TipsWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--r-neutral-foot);
  gap: 2px;
  .icon {
    margin-left: 4px;
    flex-shrink: 0;
  }
`;

type Props = {
  title: string | JSX.Element;
  className?: string;
  iconClassName?: string;
  overlayClassName?: string;
  children?: ReactNode;
  size?: number;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  ghost?: boolean;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
};

export const Tips: React.FC<Props> = ({
  title,
  className,
  iconClassName,
  children,
  placement,
  overlayClassName,
  size = 14,
  ghost,
  onClick,
}) => {
  const Icon = ghost ? IconRcQuestionGhost : IconRcQuestion;

  return (
    <TipsWrapper className={className} onClick={onClick}>
      {children}
      <HelperTooltip
        title={title}
        arrowPointAtCenter
        placement={placement}
        overlayClassName={overlayClassName}
      >
        <Icon className={iconClassName} width={size} height={size} />
      </HelperTooltip>
    </TipsWrapper>
  );
};

export default Tips;
