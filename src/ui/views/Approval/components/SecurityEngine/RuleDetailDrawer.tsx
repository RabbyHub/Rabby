import {
  RuleConfig,
  NumberDefine,
  EnumDefine,
  Level,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { sortBy } from 'lodash';
import { SecurityEngineLevelOrder } from 'consts';
import { PageHeader } from 'ui/component';
import styled from 'styled-components';
import SecurityLevel from './SecurityLevel';

const ThresholdWrapper = styled.div`
  border-radius: 4px;
  padding: 18px 12px;
  display: flex;
  font-weight: 500;
  font-size: 15px;
  line-height: 18px;
  margin-bottom: 12px;
  .threshold-display {
    font-weight: 700;
    font-size: 13px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #f7fafc);
    margin-left: 8px;
  }
  &.safe {
    color: #27c193;
    background: rgba(39, 193, 147, 0.06);
  }
  &.warning {
    color: #ffb020;
    background: rgba(255, 176, 32, 0.06);
  }
  &.danger {
    color: #ec5151;
    background: rgba(236, 81, 81, 0.06);
  }
  &.forbidden {
    color: #af160e;
    background: rgba(236, 81, 81, 0.06);
  }
`;

const ThresholdItem = ({ rule, level }: { rule: RuleConfig; level: Level }) => {
  const { t } = useTranslation();
  const displayThreshold = useMemo(() => {
    const threshold = {
      ...rule.defaultThreshold,
      ...rule.customThreshold,
    };
    const value = threshold[level];
    const levelThreshold = threshold[level];
    switch (rule.valueDefine.type) {
      case 'boolean':
        if (value === true) return 'Yes';
        return 'No';
      case 'percent':
      case 'float':
      case 'int': {
        const { max: valueMax, min: valueMin } = rule.valueDefine;
        const {
          max,
          min,
          maxIncluded,
          minIncluded,
        } = levelThreshold as NumberDefine;
        const arr: string[] = [];
        if (min !== null) {
          if (minIncluded) {
            if (min === valueMax) {
              arr.push(min.toString());
            } else {
              arr.push(
                `≥${min}${rule.valueDefine.type === 'percent' ? '%' : ''}`
              );
            }
          } else {
            arr.push(
              `>${min}${rule.valueDefine.type === 'percent' ? '%' : ''}`
            );
          }
        }
        if (max !== null) {
          if (maxIncluded) {
            if (max === valueMin) {
              arr.push(max.toString());
            } else {
              arr.push(
                `≤${max}${rule.valueDefine.type === 'percent' ? '%' : ''}`
              );
            }
          } else {
            arr.push(
              `<${max}${rule.valueDefine.type === 'percent' ? '%' : ''}`
            );
          }
        } else {
          arr.push('∞');
        }
        return arr.join(' ; ');
      }
      case 'enum':
        return (levelThreshold as string[])
          .map((item) => (rule.valueDefine as EnumDefine).display[item])
          .join(' or ');
      default:
        return '';
    }
  }, [rule, level]);
  return (
    <ThresholdWrapper className={level}>
      <SecurityLevel level={level} />
      {':'}
      <span className="threshold-display">
        {t('page.securityEngine.whenTheValueIs', { value: displayThreshold })}
      </span>
    </ThresholdWrapper>
  );
};

const RuleDetailDrawerWrapper = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: var(--r-neutral-bg-1, #3d4251);
  transform: translateX(100%);
  transition: transform 0.3s;
  padding: 20px;
  border-radius: 16px 16px 0px 0px;
  .page-header {
    padding-top: 0;
  }
  &.show {
    transform: translateX(0);
  }
`;

const RuleDetailDrawer = ({
  visible,
  rule,
  onCancel,
}: {
  visible: boolean;
  rule: RuleConfig;
  onCancel(): void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel();
    }, 500);
  };

  useEffect(() => {
    setTimeout(() => {
      setIsVisible(visible);
    }, 100);
  }, [visible]);

  const thresholds = useMemo(() => {
    const merged = {
      ...rule.defaultThreshold,
      ...rule.customThreshold,
    };
    return sortBy(Object.keys(merged), (key) => {
      return SecurityEngineLevelOrder.findIndex((k) => k === key);
    }).map((key) => {
      return {
        data: merged[key],
        level: key as Level,
      };
    });
  }, [rule]);

  return (
    <RuleDetailDrawerWrapper
      className={clsx({
        show: isVisible,
        hidden: !visible,
      })}
    >
      <PageHeader forceShowBack onBack={handleCancel}>
        {t('page.securityEngine.viewRules')}
      </PageHeader>
      <div>
        {thresholds.map((threshold) => (
          <ThresholdItem
            rule={rule}
            level={threshold.level}
            key={threshold.level}
          />
        ))}
      </div>
    </RuleDetailDrawerWrapper>
  );
};

export default RuleDetailDrawer;
