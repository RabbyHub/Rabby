import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { Result } from '@debank/rabby-security-engine';
import { Level } from '@debank/rabby-security-engine/dist/rules';
import styled from 'styled-components';
import SecurityLevelTag from '../SecurityEngine/SecurityLevelTagNoText';
import IconEdit from 'ui/assets/editpen.svg';

const RuleResultWrapper = styled.div`
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 15px 16px;
  padding-right: 24px;
  background: #f5f6fa;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;

  .rule-desc {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: #4b4d59;
    width: 49%;
  }
  .rule-value {
    display: flex;
    justify-content: flex-end;
    flex: 1;
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: #13141a;
  }
  .collect-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    &-item {
      img {
        width: 20px;
        height: 20px;
        border-radius: 100%;
      }
    }
  }
`;

const RuleResult = ({
  rule,
  collectList,
  popularLevel,
  ignored,
  hasSafe,
  hasForbidden,
  userListResult,
  onSelect,
  onEditUserList,
}: {
  rule: { id: string; desc: string; result: Result | null };
  collectList: { name: string; logo_url: string }[];
  popularLevel: string | null;
  ignored: boolean;
  hasSafe: boolean;
  hasForbidden: boolean;
  userListResult?: Result;
  onSelect(rule: { id: string; desc: string; result: Result | null }): void;
  onEditUserList(): void;
}) => {
  const handleClick = () => {
    if (!rule.result) return;
    onSelect(rule);
  };

  const translucent = useMemo(() => {
    if (!rule.result) return false;
    if (rule.result.level === Level.FORBIDDEN) {
      return false;
    } else if (rule.result.level === Level.SAFE) {
      return hasForbidden;
    } else if (
      rule.result.level === Level.ERROR ||
      rule.result.level === Level.CLOSED ||
      ignored
    ) {
      return false;
    } else {
      if (hasForbidden) {
        return false;
      } else {
        return hasSafe;
      }
    }
  }, [hasSafe, hasForbidden, rule, ignored]);

  const ruleDesc = () => {
    if (rule.id === '1004') {
      return <>Listed by</>;
    }
    if (rule.id === '1005') {
      return <>Site popularity</>;
    }
    if (rule.id === '1006' || rule.id === '1007') {
      return <>My mark</>;
    }
    if (rule.result) {
      if (
        (rule.id === '1002' || rule.id === '1001' || rule.id === '1003') &&
        [Level.DANGER, Level.FORBIDDEN, Level.WARNING].includes(
          rule.result.level
        )
      ) {
        return rule.desc.replace(/Phishing check/, 'Flagged');
      } else {
        return rule.desc;
      }
    }
  };

  return (
    <RuleResultWrapper>
      <div className="rule-desc flex items-center">{ruleDesc()}</div>
      <div className="rule-value">
        {rule.id === '1004' && (
          <div className="collect-list">
            {collectList.length <= 0 && 'None'}
            {collectList.length > 0 &&
              collectList.slice(0, 10).map((item) => (
                <div className="collect-list-item">
                  <Tooltip
                    title={item.name}
                    placement="top"
                    overlayClassName="rectangle"
                  >
                    <img src={item.logo_url} />
                  </Tooltip>
                </div>
              ))}
          </div>
        )}
        {rule.id === '1005' && (
          <div>
            {popularLevel === 'high' && 'High'}
            {popularLevel === 'medium' && 'Medium'}
            {popularLevel === 'low' && 'Low'}
            {popularLevel === 'very_low' && 'Very Low'}
          </div>
        )}
        {['1001', '1002', '1003'].includes(rule.id) && rule.result && (
          <div>{rule.result.value ? 'Yes' : 'No'}</div>
        )}
        {(rule.id === '1006' || rule.id === '1007') && (
          <div className="flex cursor-pointer" onClick={onEditUserList}>
            {!userListResult && 'No mark'}
            {userListResult && userListResult.id === '1006' && 'Blocked'}
            {userListResult && userListResult.id === '1007' && 'Trusted'}
            <img src={IconEdit} className="ml-6 icon icon-edit" />
          </div>
        )}
      </div>
      {rule.result && !ignored && (
        <SecurityLevelTag
          level={rule.result.level}
          onClick={handleClick}
          translucent={translucent}
          right="-12px"
        />
      )}
      {rule.result && ignored && (
        <SecurityLevelTag level="proceed" onClick={handleClick} right="-12px" />
      )}
    </RuleResultWrapper>
  );
};

export default RuleResult;
