import React, { useMemo } from 'react';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import { SecurityEngineLevel } from 'consts';
import styled from 'styled-components';

const SecurityLevelWrapper = styled.div`
  display: flex;
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  align-items: center;
  .icon-level {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
`;

const SecurityLevel = ({ level }: { level: Level | 'proceed' }) => {
  const currentLevel = useMemo(() => {
    return SecurityEngineLevel[level];
  }, [level]);

  return (
    <SecurityLevelWrapper style={{ color: currentLevel.color }}>
      <img src={currentLevel.icon} className="icon-level" />
      {currentLevel.text}
    </SecurityLevelWrapper>
  );
};

export default SecurityLevel;
