import cx from 'clsx';
import React from 'react';
import { cn } from '@/ui/utils/cn';
import styles from './LabelWithIcons.module.css';

type Props = {
  label: string | JSX.Element | undefined;
  icon: JSX.Element;
  maxWidth?: number;
  style?: React.CSSProperties;
  textHidden?: boolean;
  labelClassName?: string;
  className?: string;
};

export const LabelWithIcon: React.FC<Props> = (props) => {
  return (
    <div
      title={typeof props.label === 'string' ? props.label : ''}
      className={cn(styles.container, props.className)}
      style={Object.assign(
        props.maxWidth ? { maxWidth: props.maxWidth } : {},
        props.style
      )}
    >
      {props.icon}
      <div className={cx(props.textHidden && 'ellipsis', props.labelClassName)}>
        {props.label}
      </div>
    </div>
  );
};

export default LabelWithIcon;
