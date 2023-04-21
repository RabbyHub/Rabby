import React from 'react';
import { Tooltip } from 'antd';
import { Result } from '@debank/rabby-security-engine';
import styled from 'styled-components';
import SecurityLevel from '../SecurityEngine/SecurityLevel';
import IconArrowRight from 'ui/assets/sign/arrow-right.svg';
import { ReactComponent as IconQuestion } from '@/ui/assets/swap/question-outline.svg';

const RuleResultWrapper = styled.div`
  display: flex;
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  min-height: 56px;
  padding: 15px 16px;
  padding-right: 12px;
  background: #f5f6fa;
  border: 1px solid #e5e9ef;
  border-radius: 8px;
  margin-bottom: 8px;
  .rule-desc {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: #13141a;
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
      font-size: 12px;
      line-height: 14px;
      color: #707280;
      margin-right: 12px;
      margin-top: 10px;
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

const PopularLevelDisplay = {
  very_low: 'Very Low',
  low: 'Low',
  average: 'Average',
  high: 'High',
};

const RuleResult = ({
  rule,
  collectList,
  popularLevel,
  ignored,
  onSelect,
}: {
  rule: { id: string; desc: string; result: Result | null };
  collectList: { name: string; logo_url: string }[];
  popularLevel: string | null;
  ignored: boolean;
  onSelect(rule: { id: string; desc: string; result: Result | null }): void;
}) => {
  const handleClick = () => {
    onSelect(rule);
  };
  return (
    <RuleResultWrapper onClick={handleClick}>
      <div className="flex justify-between items-center">
        <div className="rule-desc flex items-center">
          {rule.desc}
          {rule.id === '1005' && (
            <>
              <Tooltip
                overlayClassName="rectangle"
                placement="top"
                title="Site popularity is calculated based on website visits and interactions."
              >
                <IconQuestion className="ml-2" />
              </Tooltip>
              <span className="text-15 font-medium text-gray-title">
                : {popularLevel && PopularLevelDisplay[popularLevel]}
              </span>
            </>
          )}
        </div>
        <div className="flex">
          {rule.result && !ignored && (
            <SecurityLevel level={rule.result.level} />
          )}
          {rule.result && ignored && <SecurityLevel level="proceed" />}
          <img src={IconArrowRight} className="icon-arrow-right" />
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
    </RuleResultWrapper>
  );
};

export default RuleResult;
