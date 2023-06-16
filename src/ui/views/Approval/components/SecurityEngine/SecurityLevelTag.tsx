import React from 'react';
import styled from 'styled-components';
import SecurityLevel from '../SecurityEngine/SecurityLevel';
import IconArrowRight from 'ui/assets/sign/arrow-right.svg';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import clsx from 'clsx';

const SecurityLevelTagWrapper = styled.div`
  padding: 4px;
  display: flex;
  position: absolute;
  top: 8px;
  right: -8px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s;
  &.translucent {
    opacity: 0.7;
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
}: {
  level: Level | 'proceed';
  translucent?: boolean;
  onClick?(): void;
}) => {
  return (
    <SecurityLevelTagWrapper
      className={clsx(level, { 'cursor-pointer': onClick, translucent })}
      onClick={onClick}
    >
      <SecurityLevel level={level} />
      <img src={IconArrowRight} className="icon-arrow-right" />
    </SecurityLevelTagWrapper>
  );
};

export default SecurityLevelTag;
