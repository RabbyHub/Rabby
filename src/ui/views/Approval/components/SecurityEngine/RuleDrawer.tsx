import React, { useEffect, useMemo, useState } from 'react';
import { Button, Switch } from 'antd';
import { Popup, Checkbox } from 'ui/component';
import {
  RuleConfig,
  Level,
  NumberDefine,
  EnumDefine,
} from '@debank/rabby-security-engine/dist/rules';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { SecurityEngineLevel, SecurityEngineLevelOrder } from 'consts';
import clsx from 'clsx';
import { useHover } from '@/ui/utils';
import RuleDetailDrawer from './RuleDetailDrawer';
import IconArrowRight from 'ui/assets/sign/arrow-right.svg';
import IconError from 'ui/assets/sign/security-engine/error-big.svg';
import IconDisable from 'ui/assets/sign/security-engine/disable-big.svg';

const RuleDrawerWrapper = styled.div`
  border-radius: 8px;
  padding: 16px;
  height: 330px;
  overflow: auto;
  position: relative;
  margin-top: 22px;
  margin-bottom: 20px;
  .value-desc {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: #13141a;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(19, 20, 26, 0.1);
    margin-bottom: 14px;
    .icon-level {
      position: absolute;
      right: 15px;
      top: 15px;
      width: 24px;
      height: 24px;
      opacity: 0.1;
    }
  }
  .threshold {
    font-size: 13px;
    line-height: 18px;
    color: #4b4d59;
    p {
      font-size: 13px;
      line-height: 18px;
      color: #4b4d59;
    }
    .value {
      color: #13141a;
      font-weight: 500;
    }
    .rule-threshold {
      display: flex;
      margin-top: 8px;
      border-radius: 4px;
      padding: 18px 12px;
      .level-icon {
        width: 16px;
        height: 16px;
        margin-right: 4px;
      }
      .level-text {
        font-weight: 500;
        font-size: 15px;
        line-height: 18px;
        margin-right: 8px;
      }
      .threshold-text {
        font-weight: 500;
        font-size: 15px;
        line-height: 18px;
        color: #13141a;
      }
    }
  }
  .rule-threshold-footer {
    position: absolute;
    bottom: 0;
    padding: 0 16px 16px;
    left: 0;
    width: 100%;
    .risk-confirm {
      display: flex;
      justify-content: center;
      font-size: 12px;
      line-height: 14px;
      color: #707280;
      margin-bottom: 12px;
      .rabby-checkbox__wrapper {
        .rabby-checkbox {
          border: 1px solid #707280;
          background-color: #fff !important;
        }
        &.checked {
          .rabby-checkbox {
            background-color: #8697ff !important;
            border: none;
          }
        }
      }
    }
    .forbidden-tip {
      margin-bottom: 12px;
      font-size: 12px;
      line-height: 14px;
      text-align: center;
      color: #13141a;
    }
    .button-ignore {
      padding: 12px;
      width: 100%;
      height: 40px;
      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      text-align: center;
      color: #ffffff;
      &[disabled] {
        opacity: 0.4;
      }
    }
  }
  &.safe {
    background: rgba(0, 192, 135, 0.06);
    .rule-threshold {
      background: rgba(39, 193, 147, 0.06);
      .level-text {
        color: #27c193;
      }
    }
  }
  &.warning {
    background: rgba(255, 176, 32, 0.06);
    .rule-threshold {
      background: rgba(255, 176, 32, 0.06);
      .level-text {
        color: #ffb020;
      }
    }
    .rule-threshold-footer {
      .button-ignore {
        background: #ffb020;
        border-color: #ffb020;
        &:hover {
          background: #ffb020;
          border-color: #ffb020;
          box-shadow: 0px 8px 16px rgba(255, 176, 32, 0.3);
        }
        &:focus {
          box-shadow: 0px 8px 16px rgba(255, 176, 32, 0.3);
        }
      }
    }
  }
  &.danger {
    background: rgba(236, 81, 81, 0.06);
    .rule-threshold {
      background: rgba(236, 81, 81, 0.06);
      .level-text {
        color: #ec5151;
      }
    }
    .rule-threshold-footer {
      .button-ignore {
        background: #ec5151;
        border-color: #ec5151;
        &:hover {
          background: #ec5151;
          border-color: #ec5151;
          box-shadow: 0px 8px 16px rgba(236, 81, 81, 0.3);
        }
        &:focus {
          box-shadow: 0px 8px 16px rgba(236, 81, 81, 0.3);
        }
      }
    }
  }
  &.forbidden {
    background: rgba(175, 22, 14, 0.06);
    .rule-threshold {
      background: rgba(236, 81, 81, 0.06);
      .level-text {
        color: #af160e;
      }
    }
    .rule-threshold-footer {
      .button-ignore {
        background: #af160e;
        border-color: #af160e;
      }
    }
  }
  &.error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f5f6fa;
  }
  &.proceed {
    background: #f5f6fa;
    .rule-threshold {
      background: rgba(0, 0, 0, 0.03);
      .level-text {
        color: #707280;
      }
    }
    .rule-threshold-footer {
      .button-ignore {
        background: #707280;
        border-color: transparent;
        &:hover {
          background: #707280;
          border-color: #707280;
          box-shadow: 0px 8px 16px rgba(112, 114, 128, 0.3);
        }
        &:focus {
          box-shadow: 0px 8px 16px rgba(112, 114, 128, 0.3);
        }
      }
    }
  }
`;

const RuleFooter = styled.div`
  background: #f5f6fa;
  border-radius: 6px;
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: #13141a;
    .right {
      display: flex;
      font-size: 12px;
      line-height: 14px;
      text-align: right;
      color: #4b4d59;
      font-weight: normal;
      align-items: center;
    }
    &:nth-child(1) {
      position: relative;
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 18px;
        width: 328px;
        height: 1px;
        background-color: #e5e9ef;
      }
    }
    &:nth-child(2) {
      cursor: pointer;
      .icon-arrow-right {
        width: 16px;
        height: 16px;
        margin-left: 4px;
      }
    }
  }
`;

interface Props {
  selectRule: {
    ruleConfig: RuleConfig;
    value?: number | string | boolean;
    level?: Level;
    ignored: boolean;
  } | null;
  visible: boolean;
  onRuleEnableStatusChange(id: string, value: boolean): Promise<void>;
  onIgnore(id: string): void;
  onUndo(id: string): void;
  onClose(update: boolean): void;
}

const RuleDrawer = ({
  visible,
  selectRule,
  onClose,
  onIgnore,
  onUndo,
  onRuleEnableStatusChange,
}: Props) => {
  const [accepted, setAccepted] = useState(false);
  const [changed, setChanged] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [ruleDetailDrawerVisible, setRuleDetailDrawerVisible] = useState(false);

  const [isHovering, hoverProps] = useHover();
  const currentLevel = useMemo(() => {
    if (!selectRule || selectRule.ignored) return 'proceed';
    return selectRule.level;
  }, [selectRule]);

  const displayValue = useMemo(() => {
    if (!selectRule) return '';
    const { value, ruleConfig } = selectRule;
    switch (ruleConfig.valueDefine.type) {
      case 'boolean':
        if (value === true) return 'True';
        return 'False';
      case 'enum':
        return ruleConfig.valueDefine.display[value as string];
      case 'percent':
        return `${Math.floor(value as number)}%`;
      case 'int':
      case 'float':
      default:
        return value;
    }
  }, [selectRule]);

  const displayThreshold = useMemo(() => {
    if (!selectRule) return '';
    const { level, ruleConfig, value } = selectRule;
    if (!level || level === Level.CLOSED || level === Level.ERROR) return '';
    const threshold = {
      ...ruleConfig.defaultThreshold,
      ...ruleConfig.customThreshold,
    };
    const levelThreshold = threshold[level];
    switch (ruleConfig.valueDefine.type) {
      case 'boolean':
        if (value === true) return 'True';
        return 'False';
      case 'float':
      case 'percent':
      case 'int': {
        const { max: valueMax, min: valueMin } = ruleConfig.valueDefine;
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
                `≥${min}${ruleConfig.valueDefine.type === 'percent' ? '%' : ''}`
              );
            }
          } else {
            arr.push(
              `>${min}${ruleConfig.valueDefine.type === 'percent' ? '%' : ''}`
            );
          }
        }
        if (max !== null) {
          if (maxIncluded) {
            if (max === valueMin) {
              arr.push(max.toString());
            } else {
              arr.push(
                `≤${max}${ruleConfig.valueDefine.type === 'percent' ? '%' : ''}`
              );
            }
          } else {
            arr.push(
              `<${max}${ruleConfig.valueDefine.type === 'percent' ? '%' : ''}`
            );
          }
        } else {
          arr.push('∞');
        }
        return arr.join(' and ');
      }
      case 'enum':
        return (levelThreshold as string[])
          .map((item) => (ruleConfig.valueDefine as EnumDefine).display[item])
          .join(' or ');
      default:
        return '';
    }
  }, [selectRule]);

  const ruleLevels = useMemo(() => {
    if (!selectRule) return '';
    const { ruleConfig } = selectRule;
    const threshold = {
      ...ruleConfig.defaultThreshold,
      ...ruleConfig.customThreshold,
    };

    return sortBy(Object.keys(threshold), (key) => {
      return SecurityEngineLevelOrder.findIndex((k) => k === key);
    })
      .map((level) => SecurityEngineLevel[level]?.text)
      .join('/');
  }, [selectRule]);

  const ignoreButtonDisabled = useMemo(() => {
    if (!selectRule) return true;
    if (selectRule.level === Level.FORBIDDEN) return true;
    if (selectRule.ignored) {
      return !isHovering;
    }
    if (selectRule.level === Level.DANGER && !accepted) return true;
    return false;
  }, [selectRule, accepted, isHovering]);

  const ignoreButtonContent = useMemo(() => {
    if (!selectRule) return { color: null, text: '' };
    let text = '';
    let color: string | null = '#B4BDCC';
    if (selectRule.ignored) {
      if (isHovering) {
        text = 'Undo';
        color = '#707280';
      } else {
        text = 'Risk Processed';
      }
    } else {
      text = 'Ignore the alert';
      color = null;
    }
    return {
      text,
      color,
    };
  }, [selectRule, isHovering]);

  const handleIgnore = () => {
    if (!selectRule || selectRule.level === Level.FORBIDDEN) return;
    onIgnore(selectRule.ruleConfig.id);
  };

  const handleUndoIgnore = () => {
    if (!selectRule) return;
    onUndo(selectRule.ruleConfig.id);
  };

  const handleEnableStatusChange = async (value: boolean) => {
    if (!selectRule) return;
    await onRuleEnableStatusChange(selectRule.ruleConfig.id, value);
    setEnabled(value);
    setChanged(true);
    onClose(true);
  };

  const handleClose = () => {
    onClose(changed);
  };

  const reset = () => {
    setAccepted(false);
    setChanged(false);
    setEnabled(null);
    setRuleDetailDrawerVisible(false);
  };

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const content = () => {
    if (!selectRule) return null;
    if (!selectRule.ruleConfig.enable) {
      return (
        <RuleDrawerWrapper className={clsx(Level.ERROR)}>
          <img src={IconDisable} />
          <p className="text-15 text-gray-content mt-4 text-center font-medium">
            Security rules have been disabled. For your safety, you can turn it
            on anytime.
          </p>
        </RuleDrawerWrapper>
      );
    } else if (selectRule.level === Level.ERROR) {
      return (
        <RuleDrawerWrapper className={clsx(selectRule.level)}>
          <img src={IconError} />
          <p className="text-15 text-gray-content mt-16 text-center font-medium">
            Unknown result because security rule is unavailable
          </p>
        </RuleDrawerWrapper>
      );
    } else {
      return (
        <RuleDrawerWrapper
          className={clsx(selectRule.ignored ? 'proceed' : selectRule.level)}
        >
          <div className="value-desc">
            {selectRule.ruleConfig.valueDescription}
            {currentLevel && (
              <img
                src={SecurityEngineLevel[currentLevel].icon}
                className="icon-level"
              />
            )}
          </div>
          <div className="threshold">
            <p>
              Current value: <span className="value">{displayValue}</span>
              <br />
              The risk level triggered by current value:
            </p>
            <div className="rule-threshold">
              {currentLevel && (
                <img
                  className="level-icon"
                  src={SecurityEngineLevel[currentLevel].icon}
                />
              )}
              {selectRule.level && (
                <span className="level-text">
                  {SecurityEngineLevel[selectRule.level].text}:
                </span>
              )}
              <span className="threshold-text">
                when the value is {displayThreshold}
              </span>
            </div>
            {selectRule.level !== 'safe' && (
              <div className="rule-threshold-footer">
                {selectRule.level === Level.DANGER && (
                  <div
                    className={clsx('risk-confirm', {
                      'opacity-50': selectRule.ignored,
                    })}
                  >
                    <Checkbox
                      checked={selectRule.ignored || accepted}
                      onChange={(val) => setAccepted(val)}
                    >
                      I understand and confirm no risks
                    </Checkbox>
                  </div>
                )}
                {selectRule.level === Level.FORBIDDEN && (
                  <p className="forbidden-tip">
                    Found forbidden risk that can't be ignored.
                  </p>
                )}
                <div {...hoverProps}>
                  <Button
                    type="primary"
                    className="button-ignore"
                    style={{
                      backgroundColor: ignoreButtonContent.color,
                    }}
                    onClick={
                      selectRule.ignored ? handleUndoIgnore : handleIgnore
                    }
                    disabled={ignoreButtonDisabled}
                  >
                    {ignoreButtonContent.text}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </RuleDrawerWrapper>
      );
    }
  };

  return (
    <Popup visible={visible} onClose={handleClose} height="510" closable>
      {selectRule && (
        <>
          {content()}
          <RuleFooter>
            <div className="item">
              <div className="left">Enable security rule</div>
              <div className="right">
                <Switch
                  checked={
                    enabled === null ? selectRule.ruleConfig.enable : enabled
                  }
                  onChange={(val) => handleEnableStatusChange(val)}
                />
              </div>
            </div>
            <div
              className="item"
              onClick={() => setRuleDetailDrawerVisible(true)}
            >
              <div className="left">View risk level</div>
              <div className="right">
                {ruleLevels}
                <img src={IconArrowRight} className="icon-arrow-right" />
              </div>
            </div>
          </RuleFooter>
        </>
      )}
      {selectRule && (
        <RuleDetailDrawer
          visible={ruleDetailDrawerVisible}
          rule={selectRule.ruleConfig}
          onCancel={() => setRuleDetailDrawerVisible(false)}
        />
      )}
    </Popup>
  );
};

export default RuleDrawer;
