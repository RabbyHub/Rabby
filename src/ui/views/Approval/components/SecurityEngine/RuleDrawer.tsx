import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
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
import IconError from 'ui/assets/sign/security-engine/error-big.svg';
import IconQuestionMark from 'ui/assets/sign/tx/question-mark.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const RuleDrawerWrapper = styled.div`
  .main {
    border-radius: 8px;
    padding: 20px 16px;
    position: relative;
    font-weight: 500;
    font-size: 13px;
    line-height: 16px;
    color: var(--r-neutral-title-1, #f7fafc);
    display: flex;
    flex-direction: column;
    margin: 20px 16px 32px;
    gap: 6px;
    text-align: center;

    .level-logo {
      display: flex;
      gap: 4px;
      font-size: 15px;
      font-weight: 500;
      line-height: 18px;
      justify-content: center;
    }
  }

  .rule-threshold-footer {
    padding: 18px 20px;
    border-top: 0.5px solid var(--r-neutral-line, #d3d8e0);

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
    .main {
      background: rgba(0, 192, 135, 0.06);
      .level-text {
        color: #27c193;
      }
    }
  }
  &.warning {
    .main {
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
    .main {
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
    .main {
      background: rgba(175, 22, 14, 0.06);
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
    .main {
      background: transparent;
      border: 0.5px solid var(--r-neutral-line, #d3d8e0);
    }
  }
  &.proceed {
    .main {
      background: var(--r-neutral-card-2, #f5f6fa);
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
    return false;
  }, [selectRule, isHovering]);

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
    setChanged(false);
    setEnabled(null);
    setRuleDetailDrawerVisible(false);
  };

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible]);

  const currentDescription = useMemo(() => {
    if (!selectRule) return '';
    const { ruleConfig, level } = selectRule;
    if (!level) return ruleConfig.valueDescription;
    return ruleConfig.descriptions?.[level] || ruleConfig.valueDescription;
  }, [selectRule]);

  const content = () => {
    if (!selectRule) return null;
    if (selectRule.level === Level.ERROR) {
      return (
        <div className="main">
          <div className="level-logo">
            <img className="level-icon w-32 h-32" src={IconError} />
          </div>
          <div>{t('page.securityEngine.unknownResult')}</div>
        </div>
      );
    } else {
      const valueTooltip = selectRule.ruleConfig.valueTooltip;
      return (
        <div className="main">
          {currentLevel && (
            <div className="level-logo">
              <img
                className="level-icon"
                src={SecurityEngineLevel[currentLevel].icon}
              />
              <span className="level-text">
                {SecurityEngineLevel[currentLevel].text}
              </span>
            </div>
          )}
          <div className="relative">
            {currentDescription}
            {valueTooltip ? (
              <TooltipWithMagnetArrow
                className="rectangle w-[max-content] max-w-[355px]"
                title={valueTooltip}
              >
                <img src={IconQuestionMark} className="inline-block ml-[3px]" />
              </TooltipWithMagnetArrow>
            ) : null}
          </div>
        </div>
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
      bodyStyle={{ padding: 0 }}
    >
      {selectRule && (
        <RuleDrawerWrapper
          className={clsx(selectRule.ignored ? 'proceed' : selectRule.level)}
        >
          {content()}
          {selectRule.level !== 'safe' && selectRule.level !== 'error' && (
            <div className="rule-threshold-footer">
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
                  onClick={selectRule.ignored ? handleUndoIgnore : handleIgnore}
                  disabled={ignoreButtonDisabled}
                >
                  {ignoreButtonContent.text}
                </Button>
              </div>
            </div>
          )}
        </RuleDrawerWrapper>
      )}
    </Popup>
  );
};

export default RuleDrawer;
