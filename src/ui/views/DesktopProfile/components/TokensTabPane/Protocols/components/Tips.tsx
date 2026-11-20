import React, { ReactNode } from 'react';

import { ReactComponent as IconRcQuestion } from 'ui/assets/approval/question.svg';
import { ReactComponent as IconRcQuestionGhost } from 'ui/assets/icon-info.svg';
import { cn } from '@/ui/utils/cn';

import HelperTooltip from './HelperTooltip';
import styles from './Tips.module.css';

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
    <span className={cn(styles.tipsWrapper, className)} onClick={onClick}>
      {children}
      <HelperTooltip
        title={title}
        arrowPointAtCenter
        placement={placement}
        overlayClassName={overlayClassName}
      >
        <Icon className={iconClassName} width={size} height={size} />
      </HelperTooltip>
    </span>
  );
};

export default Tips;
