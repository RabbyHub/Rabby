import React, { useMemo } from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { Result } from '@rabby-wallet/rabby-security-engine';
import { Level } from '@rabby-wallet/rabby-security-engine/dist/rules';
import styled from 'styled-components';
import SecurityLevelTag from '../SecurityEngine/SecurityLevelTagNoText';
import IconEdit from 'ui/assets/editpen.svg';

const RuleResultWrapper = styled.div`
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 15px 16px;
  padding-right: 24px;
  background: var(--r-neutral-card-2, rgba(255, 255, 255, 0.06));
  border: none;
  border-radius: 8px;
  margin-bottom: 8px;
  position: relative;

  .rule-desc {
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body, #3e495e);
    width: 49%;
  }
  .rule-value {
    display: flex;
    justify-content: flex-end;
    flex: 1;
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #192945);
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
  const { t } = useTranslation();
  const handleClick = () => {
    if (!rule.result) return;
    onSelect({
      ...rule,
      id: rule.result.id,
    });
  };

  const translucent = useMemo(() => {
    if (!rule.result) return false;
    if (rule.result.level === Level.FORBIDDEN) {
      return false;
    } else if (rule.result.level === Level.SAFE) {
      return hasForbidden;
    } else if (
      rule.result.level === Level.ERROR ||
      !rule.result.enable ||
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
      return <>{t('page.connect.listedBy')}</>;
    }
    if (rule.id === '1005') {
      return <>{t('page.connect.sitePopularity')}</>;
    }
    if (rule.id === '1006' || rule.id === '1007') {
      return <>{t('page.connect.markRuleText')}</>;
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
            {collectList.length <= 0 && t('page.connect.noWebsite')}
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
            {popularLevel === 'high' && t('page.connect.popularLevelHigh')}
            {popularLevel === 'medium' && t('page.connect.popularLevelMedium')}
            {popularLevel === 'low' && t('page.connect.popularLevelLow')}
            {popularLevel === 'very_low' &&
              t('page.connect.popularLevelVeryLow')}
          </div>
        )}
        {['1001', '1002', '1003'].includes(rule.id) && rule.result && (
          <div>
            {rule.result.value
              ? t('page.securityEngine.yes')
              : t('page.securityEngine.no')}
          </div>
        )}
        {(rule.id === '1006' || rule.id === '1007') && (
          <div className="flex cursor-pointer" onClick={onEditUserList}>
            {!userListResult && t('page.connect.noMark')}
            {userListResult &&
              userListResult.id === '1006' &&
              t('page.connect.blocked')}
            {userListResult &&
              userListResult.id === '1007' &&
              t('page.connect.trusted')}
            <img src={IconEdit} className="ml-6 icon icon-edit" />
          </div>
        )}
        {rule.id === '1070' && rule.result && (
          <div>
            {rule.result.value
              ? t('page.securityEngine.yes')
              : t('page.securityEngine.no')}
          </div>
        )}
      </div>
      {rule.result && !ignored && rule.result.enable && (
        <SecurityLevelTag
          enable
          level={rule.result.level}
          onClick={handleClick}
          translucent={translucent}
          right="-12px"
        />
      )}
      {rule.result && !rule.result.enable && (
        <SecurityLevelTag
          enable={false}
          level="proceed"
          onClick={handleClick}
          right="-12px"
        />
      )}
      {rule.result && ignored && (
        <SecurityLevelTag
          enable={rule.result.enable}
          level="proceed"
          onClick={handleClick}
          right="-12px"
        />
      )}
    </RuleResultWrapper>
  );
};

export default RuleResult;
