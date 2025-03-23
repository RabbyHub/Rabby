import React, { ReactNode, useMemo } from 'react';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import styled from 'styled-components';
import clsx from 'clsx';
import { SecurityEngineLevel } from 'consts';
import { ReactComponent as IconArrowRight } from 'ui/assets/sign/arrow-right-lite.svg';
import { useHover } from 'ui/utils';

const Wrapper = styled.div`
  display: flex;
  font-size: 12px;
  line-height: 14px;
  align-items: center;
  font-weight: normal;
  .icon-level {
    width: 16px;
    height: 16px;
    margin-right: 2px;
  }
  span {
    display: none;
  }
  &.showText {
    padding: 0;
    span {
      display: block;
    }
  }
`;

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
    <Wrapper
      className={clsx({ showText })}
      style={{ color: currentLevel.color }}
    >
      <img src={currentLevel.icon} className="icon-level" />
      <span>{currentLevel.text}</span>
    </Wrapper>
  );
};

const SecurityLevelTagWrapper = styled.div`
  padding: 4px;
  display: flex;
  position: absolute;
  top: 50%;
  margin-top: -10px;
  right: -6px;
  padding: 2px;
  padding-left: 6px;
  border-radius: 3px;
  transition: all 0.3s;
  max-width: 40px;
  overflow: hidden;
  align-items: center;
  &.translucent {
    opacity: 0.7;
  }
  &.showText {
    width: max-content;
    max-width: 170px;
    white-space: nowrap;
  }
  &.safe {
    color: #27c193;
    background: #dff6ef;
    border: 0.5px solid rgba(39, 193, 147, 0.5);
  }
  &.forbidden {
    color: #af160e;
    background: #f3dcdb;
    border: 0.5px solid rgba(175, 22, 14, 0.5);
  }
  &.danger {
    color: #ec5151;
    background: #fce5e5;
    border: 0.5px solid rgba(236, 81, 81, 0.5);
  }
  &.warning {
    color: #ffb020;
    background: #fff3de;
    border: 0.5px solid rgba(255, 176, 32, 0.5);
  }
  &.proceed {
    color: #707280;
    background: #eaeaec;
    border: 0.5px solid rgba(112, 114, 128, 0.5);
  }
  &.closed,
  &.error {
    color: #b4bdcc;
    background: #eaeaec;
    border: 0.5px solid rgba(112, 114, 128, 0.5);
  }
  &:hover {
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    opacity: 1;
  }
`;

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
    <SecurityLevelTagWrapper
      className={clsx(
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
    </SecurityLevelTagWrapper>
  );
};

export default SecurityLevelTag;
