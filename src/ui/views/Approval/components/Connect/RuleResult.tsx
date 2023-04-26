import React, { useMemo } from 'react';
import { Result } from '@debank/rabby-security-engine';
import styled from 'styled-components';
import SecurityLevelTag from '../SecurityEngine/SecurityLevelTag';
import { Level } from '@debank/rabby-security-engine/dist/rules';

const RuleResultWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 56px;
  padding: 15px 16px;
  padding-right: 0;
  background: #f5f6fa;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;

  .rule-desc {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: #13141a;
    padding-right: 80px;
  }
  .icon-arrow-right {
    width: 16px;
    height: 16px;
    margin-left: 4px;
  }
  .collect-list {
    display: flex;
    flex-wrap: wrap;
    &-item {
      display: flex;
      align-items: center;
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: #13141a;
      margin-right: 12px;
      margin-top: 8px;
      img {
        width: 16px;
        height: 16px;
        border-radius: 100%;
        margin-right: 4px;
      }
      &:nth-last-child(1) {
        margin-right: 0;
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
  onSelect,
}: {
  rule: { id: string; desc: string; result: Result | null };
  collectList: { name: string; logo_url: string }[];
  popularLevel: string | null;
  ignored: boolean;
  hasSafe: boolean;
  hasForbidden: boolean;
  onSelect(rule: { id: string; desc: string; result: Result | null }): void;
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

  return (
    <RuleResultWrapper>
      <div className="flex justify-between items-center w-full">
        <div className="rule-desc flex items-center">
          {rule.id === '1004' && (
            <div
              className={
                collectList.length > 0
                  ? 'text-12 text-gray-subTitle font-normal'
                  : ''
              }
            >
              {collectList.length === 0
                ? 'Not listed by any community platforms'
                : `Listed by ${collectList.length} community platform${
                    collectList.length > 1 ? 's' : ''
                  }`}
            </div>
          )}
          {rule.id === '1005' && (
            <>
              {popularLevel === 'high' && 'Popular site with many visitors'}
              {popularLevel === 'medium' &&
                'Average level of popularity among users'}
              {popularLevel === 'low' && 'Low popularity with few visitors'}
              {popularLevel === 'very_low' && 'Very few visitors to this site'}
            </>
          )}
          {rule.id !== '1004' && rule.id !== '1005' && rule.desc}
        </div>
      </div>
      {rule.id === '1004' && (
        <div className="collect-list">
          {collectList.map((item) => (
            <div className="collect-list-item">
              <img src={item.logo_url} />
              {item.name}
            </div>
          ))}
        </div>
      )}
      {rule.result && !ignored && (
        <SecurityLevelTag
          level={rule.result.level}
          onClick={handleClick}
          translucent={translucent}
        />
      )}
      {rule.result && ignored && (
        <SecurityLevelTag level="proceed" onClick={handleClick} />
      )}
    </RuleResultWrapper>
  );
};

export default RuleResult;
