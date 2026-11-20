import React, { ReactNode, useMemo } from 'react';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { SecurityEngineLevel } from 'consts';
import { ReactComponent as IconArrowRight } from 'ui/assets/sign/arrow-right-lite.svg';
import { useHover } from 'ui/utils';
import { cn } from '@/ui/utils/cn';
import styles from './SecurityLevelTagNoText.module.css';

const SecurityLevelTagNoText = ({
  enable,
  level,
  showText,
}: {
  enable: boolean;
  level: Level | 'proceed';
  showText: boolean;
}) => {
  const currentLevel = useMemo(() => {
    if (!enable) {
      return SecurityEngineLevel.closed;
    }
    return SecurityEngineLevel[level];
  }, [level, enable]);

  return (
    <div
      className={cn(styles.wrapper, { showText })}
      style={{ color: currentLevel.color }}
    >
      <img src={currentLevel.icon} className="icon-level" />
      <span>{currentLevel.text}</span>
    </div>
  );
};

const SecurityLevelTag = ({
  enable,
  level,
  translucent,
  onClick,
  right = '-28px',
  className,
  inSubTable,
}: {
  enable: boolean;
  level: Level | 'proceed';
  translucent?: boolean;
  onClick?(): void;
  right?: string;
  className?: string;
  // adjust position for sub table
  inSubTable?: boolean;
}) => {
  const [isHovering, hoverProps] = useHover();
  if (inSubTable) {
    right = `${parseInt(right, 10) - 12}px`;
  }

  return (
    <div
      className={cn(
        styles.securityLevelTagWrapper,
        'security-level-tag',
        enable ? level : '',
        {
          'cursor-pointer': onClick,
          translucent,
          showText: isHovering,
          closed: !enable,
        },
        className
      )}
      style={{
        right,
      }}
      onClick={onClick}
      {...hoverProps}
    >
      <SecurityLevelTagNoText
        enable={enable}
        level={level}
        showText={isHovering}
      />
      <IconArrowRight className="icon-arrow-right" />
    </div>
  );
};

export default SecurityLevelTag;
