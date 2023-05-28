import React, { useMemo } from 'react';
import { Level } from '@debank/rabby-security-engine/dist/rules';
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
  padding: 1px 0;
  font-weight: normal;
  .icon-level {
    width: 12px;
    height: 12px;
    margin-right: 4px;
  }
  span {
    display: none;
    margin-right: 6px;
  }
  &.showText {
    padding: 0;
    span {
      display: block;
    }
  }
`;

const SecurityLevelTagNoText = ({
  level,
  showText,
}: {
  level: Level | 'proceed';
  showText: boolean;
}) => {
  const currentLevel = useMemo(() => {
    return SecurityEngineLevel[level];
  }, [level]);

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
  margin-top: -12px;
  right: -6px;
  padding: 4px;
  border-radius: 3px;
  transition: all 0.3s;
  max-width: 31px;
  overflow: hidden;
  align-items: center;
  &.translucent {
    opacity: 0.7;
  }
  &.showText {
    max-width: 100px;
  }
  &.safe {
    color: #27c193;
    background: rgba(39, 193, 147, 0.15);
    border: 0.5px solid rgba(39, 193, 147, 0.5);
  }
  &.forbidden {
    color: #af160e;
    background: rgba(175, 22, 14, 0.15);
    border: 0.5px solid rgba(175, 22, 14, 0.5);
  }
  &.danger {
    color: #ec5151;
    background: rgba(236, 81, 81, 0.15);
    border: 0.5px solid rgba(236, 81, 81, 0.5);
  }
  &.warning {
    color: #ffb020;
    background: rgba(255, 176, 32, 0.15);
    border: 0.5px solid rgba(255, 176, 32, 0.5);
  }
  &.proceed {
    color: #707280;
    background: rgba(112, 114, 128, 0.15);
    border: 0.5px solid rgba(112, 114, 128, 0.5);
  }
  &.closed,
  &.error {
    color: #b4bdcc;
    background: rgba(112, 114, 128, 0.15);
    border: 0.5px solid rgba(112, 114, 128, 0.5);
  }
  &:hover {
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    opacity: 1;
    &.safe {
      background: rgba(39, 193, 147, 0.3);
      border: 0.5px solid rgba(39, 193, 147, 1);
    }
    &.forbidden {
      color: #af160e;
      background: rgba(175, 22, 14, 0.3);
      border: 0.5px solid rgba(175, 22, 14, 1);
    }
    &.danger {
      color: #ec5151;
      background: rgba(236, 81, 81, 0.3);
      border: 0.5px solid rgba(236, 81, 81, 1);
    }
    &.warning {
      color: #ffb020;
      background: rgba(255, 176, 32, 0.3);
      border: 0.5px solid rgba(255, 176, 32, 1);
    }
    &.proceed {
      color: #707280;
      background: rgba(112, 114, 128, 0.3);
      border: 0.5px solid rgba(112, 114, 128, 1);
    }
    &.closed,
    &.error {
      color: #b4bdcc;
      background: rgba(112, 114, 128, 0.3);
      border: 0.5px solid rgba(112, 114, 128, 1);
    }
  }
`;

const SecurityLevelTag = ({
  level,
  translucent,
  onClick,
  right = '-6px',
}: {
  level: Level | 'proceed';
  translucent?: boolean;
  onClick?(): void;
  right?: string;
}) => {
  const [isHovering, hoverProps] = useHover();

  return (
    <SecurityLevelTagWrapper
      className={clsx(level, {
        'cursor-pointer': onClick,
        translucent,
        showText: isHovering,
      })}
      style={{
        right,
      }}
      onClick={onClick}
      {...hoverProps}
    >
      <SecurityLevelTagNoText level={level} showText={isHovering} />
      <IconArrowRight className="icon-arrow-right" />
    </SecurityLevelTagWrapper>
  );
};

export default SecurityLevelTag;
