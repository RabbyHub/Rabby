import React, { useEffect, useMemo, useState } from 'react';
import { Button, Switch } from 'antd';
import { useTranslation } from 'react-i18next';
import { Popup, Checkbox } from 'ui/component';
import {
  RuleConfig,
  Level,
  NumberDefine,
  EnumDefine,
} from '@rabby-wallet/rabby-security-engine/dist/rules';
import styled from 'styled-components';
import { sortBy } from 'lodash';
import { SecurityEngineLevel, SecurityEngineLevelOrder } from 'consts';
import clsx from 'clsx';
import { useHover } from '@/ui/utils';
import RuleDetailDrawer from './RuleDetailDrawer';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/sign/arrow-right.svg';
import IconError from 'ui/assets/sign/security-engine/error-big.svg';
import IconDisable from 'ui/assets/sign/security-engine/disable-big.svg';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';

const RuleDrawerWrapper = styled.div`
  border-radius: 8px;
  padding: 16px;
  height: 300px;
  overflow: auto;
  position: relative;
  margin-bottom: 20px;
  .value-desc {
    font-weight: 500;
    font-size: 15px;
    line-height: 18px;
    color: var(--r-neutral-title-1, #f7fafc);
    padding-bottom: 16px;
    border-bottom: 1px solid var(--r-neutral-line, rgba(255, 255, 255, 0.1));
    margin-bottom: 14px;
    display: flex;
    .desc-title {
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-body, #d3d8e0);
      margin-right: 6px;
      font-weight: normal;
      margin-top: 1px;
    }
  }
  .threshold {
    font-size: 13px;
    line-height: 18px;
    color: var(--r-neutral-body, #d3d8e0);
    p {
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-body, #d3d8e0);
      margin-bottom: 8px;
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
        color: var(--r-neutral-title-1, #f7fafc);
      }
      .current-value {
        font-size: 12px;
        line-height: 14px;
        color: var(--r-neutral-foot, #babec5);
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
          border: 1px solid var(--r-neutral-line);
          background-color: var(--r-neutral-foot) !important;
        }
        &.checked {
          .rabby-checkbox {
            background-color: var(--r-blue-default, #7084ff) !important;
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
    background: var(--r-neutral-card-2, #f5f6fa);
  }
  &.proceed {
    background: var(--r-neutral-card-2, #f5f6fa);
    .rule-threshold {
      background: var(--r-neutral-card-3, #f7fafc);
      .level-text {
        color: var(--r-neutral-foot, #babec5);
      }
    }
    .rule-threshold-footer {
      .rabby-checkbox__label {
        color: var(--r-neutral-foot, #babec5);
      }

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
  background: var(--r-neutral-card-2, rgba(255, 255, 255, 0.06));
  border-radius: 6px;
  .item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-title-1, #f7fafc);
    .right {
      display: flex;
      font-size: 12px;
      line-height: 14px;
      text-align: right;
      color: var(--r-neutral-body, #d3d8e0);
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
        background-color: var(--r-neutral-line, rgba(255, 255, 255, 0.1));
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
  const { t } = useTranslation();

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
        if (value === true) return t('page.securityEngine.yes');
        return t('page.securityEngine.no');
      case 'enum':
        return ruleConfig.valueDefine.display[value as string];
      case 'percent':
        return `${(value as number).toFixed(2)}%`;
      case 'int':
        return Math.floor(value as number);
      case 'float':
        return (value as number).toFixed(2);
      default:
        return value;
    }
  }, [selectRule]);

  const displayThreshold = useMemo(() => {
    if (!selectRule) return '';
    const { level, ruleConfig, value } = selectRule;
    if (!level || !ruleConfig.enable || level === Level.ERROR) return '';
    const threshold = {
      ...ruleConfig.defaultThreshold,
      ...ruleConfig.customThreshold,
    };
    const levelThreshold = threshold[level];
    switch (ruleConfig.valueDefine.type) {
      case 'boolean':
        if (value === true) return 'Yes';
        return 'No';
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
        return arr.join(' ; ');
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
        text = t('page.securityEngine.undo');
        color = '#707280';
      } else {
        text = t('page.securityEngine.riskProcessed');
      }
    } else {
      text = t('page.securityEngine.ignoreAlert');
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
            {t('page.securityEngine.ruleDisabled')}
          </p>
        </RuleDrawerWrapper>
      );
    } else if (selectRule.level === Level.ERROR) {
      return (
        <RuleDrawerWrapper className={clsx(selectRule.level)}>
          <img src={IconError} />
          <p className="text-15 text-gray-content mt-16 text-center font-medium">
            {t('page.securityEngine.unknownResult')}
          </p>
        </RuleDrawerWrapper>
      );
    } else {
      const valueTooltip = selectRule.ruleConfig.valueTooltip;
      return (
        <RuleDrawerWrapper
          className={clsx(selectRule.ignored ? 'proceed' : selectRule.level)}
        >
          <div className="value-desc">
            <span className="desc-title">Description:</span>
            <div className="relative">
              {selectRule.ruleConfig.valueDescription}
              {valueTooltip ? (
                <TooltipWithMagnetArrow
                  className="rectangle w-[max-content] max-w-[355px]"
                  title={valueTooltip}
                >
                  <img
                    src={IconQuestionMark}
                    className="inline-block ml-[3px]"
                  />
                </TooltipWithMagnetArrow>
              ) : null}
            </div>
          </div>
          <div className="threshold">
            <p>{t('page.securityEngine.alertTriggerReason')}</p>
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
              <div>
                <div className="threshold-text">
                  {t('page.securityEngine.whenTheValueIs', {
                    value: displayThreshold,
                  })}
                </div>
                <div className="current-value">
                  {t('page.securityEngine.currentValueIs', {
                    value: displayThreshold,
                  })}
                </div>
              </div>
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
                      {t('page.securityEngine.understandRisk')}
                    </Checkbox>
                  </div>
                )}
                {selectRule.level === Level.FORBIDDEN && (
                  <p className="forbidden-tip">
                    {t('page.securityEngine.forbiddenCantIgnore')}
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
    <Popup
      visible={visible}
      onClose={handleClose}
      height="auto"
      className="rule-detail-modal"
      closable
      title={t('page.securityEngine.ruleDetailTitle')}
      isSupportDarkMode
    >
      {selectRule && (
        <>
          {content()}
          <RuleFooter>
            <div className="item">
              <div className="left">{t('page.securityEngine.enableRule')}</div>
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
              <div className="left">
                {t('page.securityEngine.viewRiskLevel')}
              </div>
              <div className="right">
                {ruleLevels}
                <ThemeIcon
                  src={RcIconArrowRight}
                  className="icon-arrow-right"
                />
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
